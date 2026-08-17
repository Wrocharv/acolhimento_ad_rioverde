import { Route, Switch } from "wouter";
import PublicFormPage from "@/pages/PublicFormPage";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminPeoplePage from "@/pages/admin/AdminPeoplePage";
import AdminPersonDetailPage from "@/pages/admin/AdminPersonDetailPage";
import AdminWelcomePendingPage from "@/pages/admin/AdminWelcomePendingPage";
import AdminExportPrintPage from "@/pages/admin/AdminExportPrintPage";
import AdminCustomFieldsPage from "@/pages/admin/AdminCustomFieldsPage";
import AdminCongregationsPage from "@/pages/admin/AdminCongregationsPage";

export default function App() {
  return (
    <Switch>
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin/boas-vindas" component={AdminWelcomePendingPage} />
      <Route path="/admin/perguntas" component={AdminCustomFieldsPage} />
      <Route path="/admin/congregacoes" component={AdminCongregationsPage} />
      <Route path="/admin/pessoas/:id" component={AdminPersonDetailPage} />
      <Route path="/admin/exportar/imprimir" component={AdminExportPrintPage} />
      <Route path="/admin" component={AdminPeoplePage} />
      <Route path="/" component={PublicFormPage} />
      <Route>
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">Página não encontrada.</div>
      </Route>
    </Switch>
  );
}
