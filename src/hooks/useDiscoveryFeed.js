import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const ITEMS_PER_PAGE = 10;

export function useDiscoveryFeed() {
  const [filter, setFilter] = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  const requestIdRef = useRef(0);

  // --- CATEGORIES ---
  useEffect(() => {
    supabase
      .from("categories")
      .select("*")
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  // --- DEBOUNCE SEARCH ---
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // --- CORE FETCH ---
  const fetchListings = useCallback(
    async (reset = false, cursorOverride = cursor) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("discovery_feed")
          .select("*")
          // BUG FIX: Only show listings that are active, not hidden, and not deleted.
          // Without these filters, hidden/removed listings were visible to all users.
          .eq("is_active", true)
          .eq("is_hidden", false)
          .eq("is_deleted", false)
          .order("visibility_score", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(ITEMS_PER_PAGE);

        if (filter !== "all") query = query.eq("listing_type", filter);
        if (categoryId) query = query.eq("category_id", categoryId);

        const clean = debouncedSearch?.trim();
        if (clean) {
          query = query.or(
            `title.ilike.%${clean}%,description.ilike.%${clean}%`,
          );
        }

        if (!reset && cursorOverride) {
          query = query.or(
            `visibility_score.lt.${cursorOverride.score},and(visibility_score.eq.${cursorOverride.score},created_at.lt.${cursorOverride.created_at}),and(visibility_score.eq.${cursorOverride.score},created_at.eq.${cursorOverride.created_at},id.lt.${cursorOverride.id})`,
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
        if (data.length < ITEMS_PER_PAGE) setHasMore(false);
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
    [filter, categoryId, debouncedSearch],
  );

  // --- RESET ON FILTER / SEARCH / resetKey CHANGE ---
  useEffect(() => {
    requestIdRef.current++;
    setCursor(null);
    setHasMore(true);
    setIsInitialLoading(true);
    fetchListings(true, null);
  }, [filter, categoryId, debouncedSearch, resetKey]);

  // --- LOAD MORE ---
  const loadMore = () => {
    if (!loading && hasMore) fetchListings(false, cursor);
  };

  // --- REFETCH ---
  const refetch = useCallback(() => {
    setResetKey((k) => k + 1);
  }, []);

  return {
    listings,
    categories,
    loading,
    isInitialLoading,
    error,
    hasMore,
    loadMore,
    refetch,
    filter,
    setFilter,
    categoryId,
    setCategoryId,
    searchTerm,
    setSearchTerm,
  };
}
