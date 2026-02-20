"use client";

import { useState } from "react";
import { catalogAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: string;
  currency?: string;
  availability?: string;
  image_url?: string;
  retailer_id?: string;
}

export default function CatalogPage() {
  const [catalogId, setCatalogId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [sendConversationId, setSendConversationId] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const loadProducts = async () => {
    if (!catalogId.trim()) return;
    setLoading(true);
    try {
      const res = await catalogAPI.getProducts(catalogId);
      setProducts(res.data.products || res.data.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedProducts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProducts(next);
  };

  const sendSingle = async (productId: string) => {
    if (!sendConversationId.trim()) {
      setMessage("Enter a conversation ID first");
      return;
    }
    setSending(true);
    try {
      await catalogAPI.sendProduct({ conversationId: sendConversationId, catalogId, productId });
      setMessage("Product message sent!");
    } catch {
      setMessage("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const sendSelected = async () => {
    if (!sendConversationId.trim()) {
      setMessage("Enter a conversation ID first");
      return;
    }
    if (selectedProducts.size === 0) {
      setMessage("Select products first");
      return;
    }
    setSending(true);
    try {
      await catalogAPI.sendProductList({
        conversationId: sendConversationId,
        catalogId,
        productIds: Array.from(selectedProducts),
        headerText: "Our Products",
        bodyText: "Check out these items!",
      });
      setMessage("Product list sent!");
      setSelectedProducts(new Set());
    } catch {
      setMessage("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const sendFullCatalog = async () => {
    if (!sendConversationId.trim()) {
      setMessage("Enter a conversation ID first");
      return;
    }
    setSending(true);
    try {
      await catalogAPI.sendCatalog({ conversationId: sendConversationId, bodyText: "Browse our full catalog!" });
      setMessage("Full catalog sent!");
    } catch {
      setMessage("Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Catalog / E-Commerce</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Browse and send product messages via WhatsApp Commerce API</p>
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Meta Catalog ID</label>
          <Input value={catalogId} onChange={(e) => setCatalogId(e.target.value)} placeholder="e.g. 123456789" />
        </div>
        <Button onClick={loadProducts} disabled={loading}>
          {loading ? "Loading..." : "Load Products"}
        </Button>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Conversation ID (to send)</label>
          <Input value={sendConversationId} onChange={(e) => setSendConversationId(e.target.value)} placeholder="Paste conv ID" />
        </div>
        <Button variant="outline" onClick={sendSelected} disabled={sending || selectedProducts.size === 0}>
          Send Selected ({selectedProducts.size})
        </Button>
        <Button variant="outline" onClick={sendFullCatalog} disabled={sending}>
          Send Full Catalog
        </Button>
      </div>

      {message && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg p-3 text-sm">
          {message}
        </div>
      )}

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {/* Products Grid */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                selectedProducts.has(p.id)
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
              onClick={() => toggleSelect(p.id)}
            >
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover rounded mb-3" />
              )}
              <h3 className="font-medium text-gray-900 dark:text-white truncate">{p.name}</h3>
              {p.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{p.description}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                {p.price && (
                  <Badge variant="default">
                    {p.currency || "$"} {(+p.price / 100).toFixed(2)}
                  </Badge>
                )}
                <Badge variant={p.availability === "in stock" ? "default" : "secondary"}>
                  {p.availability || "Unknown"}
                </Badge>
              </div>
              <div className="mt-2 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendSingle(p.id);
                  }}
                  disabled={sending}
                >
                  Send
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && products.length === 0 && catalogId && (
        <p className="text-center text-gray-500 py-12">No products found. Check your catalog ID or load products from Meta Commerce Manager.</p>
      )}
    </div>
  );
}
