import { redirect } from "next/navigation";

export default function MembershipsIndexPage() {
  redirect("/admin/memberships/plans");
}
