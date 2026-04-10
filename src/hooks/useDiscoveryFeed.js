import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const ITEMS_PER_PAGE = 10;

export function useDiscoveryFeed() {
  const [filter, setFilter] = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  const [hasMore, setHasMore] = useState(true);

  const [cursor, setCursor] = useState(null);

  const requestIdRef = useRef(0);

  // --- FETCH CATEGORIES ---
  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase.from("categories").select("*");
      if (!error && data) setCategories(data);
    }
    loadCategories();
  }, []);

  // --- DEBOUNCE SEARCH ---
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- CORE FETCH FUNCTION ---
  const fetchListings = useCallback(
    async (reset = false) => {
      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("discovery_feed")
          .select("*")
          .order("visibility_score", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(ITEMS_PER_PAGE);

        if (filter !== "all") {
          query = query.eq("listing_type", filter);
        }

        if (categoryId) {
          query = query.eq("category_id", categoryId);
        }

        const cleanSearch = debouncedSearchTerm?.trim();
        if (cleanSearch) {
          query = query.or(
            `title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`,
          );
        }

        if (!reset && cursor) {
          query = query.or(
            `visibility_score.lt.${cursor.score},and(visibility_score.eq.${cursor.score},created_at.lt.${cursor.created_at}),and(visibility_score.eq.${cursor.score},created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
          );
        }

        const { data, error } = await query;

        if (error) throw error;
        if (requestId !== requestIdRef.current) return;

        if (!data || data.length === 0) {
          setHasMore(false);
          if (reset) setListings([]);
          return;
        }

        setListings((prev) => {
          const ids = new Set(prev.map((i) => i.id));
          return reset
            ? data
            : [...prev, ...data.filter((d) => !ids.has(d.id))];
        });

        const last = data[data.length - 1];
        setCursor({
          score: last.visibility_score,
          created_at: last.created_at,
          id: last.id,
        });

        if (data.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
      } catch (err) {
        console.error("Feed Error:", err.message);
        setError(err.message);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setIsInitialLoading(false);
        }
      }
    },
    [filter, categoryId, debouncedSearchTerm, cursor],
  );

  // --- 🔥 THIS IS THE FIX (REFETCH) ---
  const refetch = useCallback(() => {
    requestIdRef.current++;
    setCursor(null);
    setHasMore(true);
    setIsInitialLoading(true);
    fetchListings(true);
  }, [fetchListings]);

  // --- RESET ON FILTER CHANGE ---
  useEffect(() => {
    requestIdRef.current++;
    setCursor(null);
    setHasMore(true);
    setIsInitialLoading(true);
    fetchListings(true);
  }, [filter, categoryId, debouncedSearchTerm]);

  const loadMore = () => {
    if (!loading && hasMore) fetchListings(false);
  };

  return {
    listings,
    categories,
    loading,
    isInitialLoading,
    error,
    hasMore,
    loadMore,
    refetch, // 🔥 EXPOSED HERE
    filter,
    setFilter,
    categoryId,
    setCategoryId,
    searchTerm,
    setSearchTerm,
  };
}
