import { SolutionPlannerPage } from "./SolutionPlannerPage";
import { useLanguage } from "@/lib/language";

export default function VatavaranPlanner() {
  const { t } = useLanguage();
  return (
    <SolutionPlannerPage
      title={t("dashboard.VatavaranPlanner")}
      solutionName="Vatavaran Monitor"
      plannerSection="user_vatavaran_planner"
    />
  );
}
