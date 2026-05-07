export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER || "https://peaceful-mustang-86.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
