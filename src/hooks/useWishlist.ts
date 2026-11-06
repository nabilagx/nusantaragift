"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FavoriteRow = { product_id: string };
type ProductSlugRow = { id: string; slug: string };

export function useWishlist() {
  const supabase = useMemo(() => createClient(), []);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState("");

  const loadFavorites = useCallback(async (nextUserId: string | null) => {
    setUserId(nextUserId);
    setError("");
    if (!nextUserId) {
      setFavorites([]);
      setIsLoaded(true);
      return;
    }

    const { data: rows, error: favoriteError } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", nextUserId);

    if (favoriteError) {
      console.error("Gagal memuat favorit:", favoriteError);
      setError("Favorit belum dapat dimuat. Coba muat ulang halaman.");
      setFavorites([]);
      setIsLoaded(true);
      return;
    }

    const productIds = ((rows ?? []) as FavoriteRow[]).map((row) => row.product_id);
    if (productIds.length === 0) {
      setFavorites([]);
      setIsLoaded(true);
      return;
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id,slug")
      .in("id", productIds);

    if (productsError) {
      console.error("Gagal memetakan produk favorit:", productsError);
      setError("Produk favorit belum dapat dimuat.");
      setFavorites([]);
    } else {
      setFavorites(((products ?? []) as ProductSlugRow[]).map((product) => product.slug));
    }
    setIsLoaded(true);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError) {
        console.error("Gagal memeriksa akun favorit:", authError);
        await loadFavorites(null);
        return;
      }
      await loadFavorites(user?.id ?? null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (active) void loadFavorites(session?.user.id ?? null);
      });
    });

    void initialize();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadFavorites, supabase]);

  const toggleFavorite = useCallback(async (slug: string) => {
    if (!userId) {
      window.location.assign("/login?next=%2Fshop");
      return;
    }

    setError("");
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (productError || !product) {
      setError("Produk tidak ditemukan atau sudah tidak tersedia.");
      return;
    }

    const { data: existing, error: lookupError } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .maybeSingle();

    if (lookupError) {
      console.error("Gagal memeriksa favorit:", lookupError);
      setError("Favorit gagal diperbarui. Coba lagi.");
      return;
    }

    if (existing) {
      const { error: deleteError } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", product.id);
      if (deleteError) {
        console.error("Gagal menghapus favorit:", deleteError);
        setError("Produk gagal dihapus dari favorit.");
        return;
      }
      setFavorites((current) => current.filter((item) => item !== slug));
    } else {
      const { error: insertError } = await supabase
        .from("favorites")
        .insert({ user_id: userId, product_id: product.id });
      if (insertError) {
        console.error("Gagal menyimpan favorit:", insertError);
        setError("Produk gagal disimpan ke favorit.");
        return;
      }
      setFavorites((current) => current.includes(slug) ? current : [...current, slug]);
    }
  }, [supabase, userId]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, toggleFavorite, isFavorite, isLoaded, error };
}
