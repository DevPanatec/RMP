import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireWriteRole } from "./lib/auth";

// Generate upload URL for file uploads
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireWriteRole(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Get file URL from storage ID
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
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
    const urls: Record<string, string | null> = {};
    for (const id of args.storageIds) {
      urls[id] = await ctx.storage.getUrl(id);
    }
    return urls;
  },
});
