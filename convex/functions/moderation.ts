import { v } from "convex/values";
import { Groq } from "groq-sdk";
import { api } from "../_generated/api";
import { action, mutation, query } from "../_generated/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const reasons = {
  S1: "Violent Crimes",
  S2: "Non-Violent Crimes",
  S3: "Sex-Related Crimes",
  S4: "Child Sexual Exploitation",
  S5: "Defamation",
  S6: "Specialized Advice",
  S7: "Privacy",
  S8: "Intellectual Property",
  S9: "Indiscriminate Weapons",
  S10: "Hate",
  S11: "Suicide & Self-Harm",
  S12: "Sexual Content",
  S13: "Elections",
  S14: "Code Interpreter Abuse"
};

export const run = action({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, { id }) => {
    const message = await ctx.runQuery(api.functions.moderation.getMessage, {
      id,
    });

    if (!message) {
      return;
    }

    const result = await groq.chat.completions.create({
      messages: [{ role: "user", content: message.content }],
      model: "llama-guard-3-8b",
    });

    const value = result.choices[0].message.content;

    if (value?.startsWith("unsafe")) {
      await ctx.runMutation(api.functions.moderation.deleteMessage, {
        id,
        reason: value.replace("unsafe", "").trim(),
      });
    }
  },
});

export const getMessage = query({
  args: { id: v.id("messages") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const deleteMessage = mutation({
  args: { id: v.id("messages"), reason: v.string() },
  handler: async (ctx, { id, reason }) => {
    await ctx.db.patch(id, {
      deleted: true,
      deletedReason: reasons[reason as keyof typeof reasons],
    });
  },
});
