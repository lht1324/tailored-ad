import {redirect} from "next/navigation";

export default async function LegalPage() {
    redirect("/legal/terms");
}