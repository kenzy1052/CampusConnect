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
  const listingsCountRef = useRef(0);

  // --- CATEGORIES ---
  useEffect(() => {
    const cached = localStorage.getItem("cc.categories.v1");
    if (cached) {
      try {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < 60 * 60 * 1000) {
          setCategories(data);
          return;
        }
      } catch {}
    }
    supabase
      .from("categories")
      .select("*")
      .then(({ data }) => {
        if (data) {
          setCategories(data);
          localStorage.setItem(
            "cc.categories.v1",
            JSON.stringify({ ts: Date.now(), data }),
          );
        }
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
        const cleanQ = debouncedSearch?.trim().replace(/[%,()]/g, "") || "";
        const isSearching = cleanQ.length > 0;

        let data, error;

        if (isSearching) {
          // ── Hybrid search path: FTS + trigram fuzzy fallback ──────────────
          // Cursor pagination doesn't combine well with relevance ranking,
          // so use offset-based paging while a search term is active.
          const offset = reset ? 0 : listingsCountRef.current;
          const res = await supabase.rpc("search_discovery_feed", {
            p_query: cleanQ,
            p_filter: filter,
            p_category: categoryId || null,
            p_limit: ITEMS_PER_PAGE,
            p_offset: offset,
          });
          data = res.data;
          error = res.error;
        } else {
          // ── Browsing path: keyset cursor on visibility_score ─────────────
          let query = supabase
            .from("discovery_feed")
            .select("*")
            .eq("is_active", true)
            .eq("is_hidden", false)
            .eq("is_deleted", false)
            .order("visibility_score", { ascending: false })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(ITEMS_PER_PAGE);

          if (filter !== "all") query = query.eq("listing_type", filter);
          if (categoryId) query = query.eq("category_id", categoryId);

          if (!reset && cursorOverride) {
            query = query.or(
              `visibility_score.lt.${cursorOverride.score},and(visibility_score.eq.${cursorOverride.score},created_at.lt.${cursorOverride.created_at}),and(visibility_score.eq.${cursorOverride.score},created_at.eq.${cursorOverride.created_at},id.lt.${cursorOverride.id})`,
            );
          }

          const res = await query;
          data = res.data;
          error = res.error;
        }

        if (error) throw error;
        if (requestId !== requestIdRef.current) return;

        if (!data || data.length === 0) {
          setHasMore(false);
          if (reset) setListings([]);
          return;
        }

        setListings((prev) => {
          const ids = new Set(prev.map((i) => i.id));
          const next = reset
            ? data
            : [...prev, ...data.filter((d) => !ids.has(d.id))];
          listingsCountRef.current = next.length;
          return next;
        });

        // Only the browsing path uses a cursor; clear it when searching.
        if (isSearching) {
          setCursor(null);
        } else {
          const last = data[data.length - 1];
          setCursor({
            score: last.visibility_score,
            created_at: last.created_at,
            id: last.id,
          });
        }

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
