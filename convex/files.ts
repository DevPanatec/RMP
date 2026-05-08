import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireWriteRole } from "./lib/auth";

// Generate upload URL for file uploads
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireWriteRole(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Get file URL from storage ID. Auth-gated: requiere usuario autenticado.
// Storage IDs son opacos pero accesibles a cualquiera con el ID — al menos exigir sesión.
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete file from storage
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    return await ctx.storage.delete(args.storageId);
  },
});

// Batch-resolve storage IDs to public URLs (for admin sidebar photo thumbnails)
export const getUrlBatch = query({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const urls: Record<string, string | null> = {};
    for (const id of args.storageIds) {
      urls[id] = await ctx.storage.getUrl(id);
    }
    return urls;
  },
});
