import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

import { LoginComponent } from './pages/login/login.component';
import { ForcePasswordChangeComponent } from './pages/force-password-change/force-password-change.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UsersComponent } from './pages/users/users.component';
import { MachinesComponent } from './pages/machines/machines.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { AiPredictionsComponent } from './pages/ai-predictions/ai-predictions.component';
import { AiChatComponent } from './pages/ai-chat/ai-chat.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { Verify2FAComponent } from './pages/verify-2fa/verify-2fa.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'verify-2fa', component: Verify2FAComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  {
    path: 'force-password-change',
    component: ForcePasswordChangeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'machines',
    component: MachinesComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'RESPONSABLE', 'TECHNICIAN'] }
  },
  {
    path: 'tasks',
    component: TasksComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'reports',
    component: ReportsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'ai-predictions',
    component: AiPredictionsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'ai-chat',
    component: AiChatComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'RESPONSABLE'] }
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
