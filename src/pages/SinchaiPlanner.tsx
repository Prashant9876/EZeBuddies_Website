import { SolutionPlannerPage } from "./SolutionPlannerPage";
import { useLanguage } from "@/lib/language";

export default function SinchaiPlanner() {
  const { t } = useLanguage();
  return (
    <SolutionPlannerPage
      title={t("dashboard.sinchaiPlanner")}
      solutionName="Smart_Sinchai"
      plannerSection="user_sinchai_planner"
    />
  );
}
