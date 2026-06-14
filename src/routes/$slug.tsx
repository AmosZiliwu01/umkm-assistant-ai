import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLandingDataBySlug, type LandingData } from "@/lib/landing";
import { getLandingTemplate } from "@/components/landing-templates/registry";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => fetchLandingDataBySlug(params.slug),
  component: LandingPage,
});

function LandingPage() {
  const { slug } = Route.useParams();
  const initial: LandingData = Route.useLoaderData();

  // Live re-fetch so updates from the dashboard reflect without a hard reload.
  const query = useQuery({
    queryKey: ["landing", "slug", slug],
    initialData: initial,
    queryFn: () => fetchLandingDataBySlug(slug),
    staleTime: 60_000,
  });

  const landing: LandingData = query.data ?? initial;

  useEffect(() => {
    if (landing.business.business_name) {
      document.title = `${landing.business.business_name} — UMKM AI`;
    }
  }, [landing.business.business_name]);

  const Template = getLandingTemplate(landing.business.landing_template);
  return <Template data={landing} />;
}