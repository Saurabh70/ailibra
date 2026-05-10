import { redirect } from "next/navigation";

// Root → Ask is the default landing page after login.
export default function Home() {
  redirect("/ask");
}
