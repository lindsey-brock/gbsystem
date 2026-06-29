import { createFileRoute, redirect } from "@tanstack/react-router";

// Hour approval moved into each contractor's detail page
// (/contractors/$id) so admins approve from the worker's own record
// instead of a separate global queue. Redirect old bookmarks there.
export const Route = createFileRoute("/_authenticated/ore/approvazione")({
  beforeLoad: () => {
    throw redirect({ to: "/contractors" });
  },
});
