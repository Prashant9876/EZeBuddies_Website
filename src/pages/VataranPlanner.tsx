import { SolutionPlannerPage } from "./SolutionPlannerPage";
import { useLanguage } from "@/lib/language";

export default function VataranPlanner() {
  const { t } = useLanguage();
  return (
    <SolutionPlannerPage
      title={t("dashboard.vataranPlanner")}
      solutionName="Vatavaran Monitor"
      plannerSection="user_vatavaran_planner"
    />
  );
}
