import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { JwtInterceptor } from './core/interceptors/jwt.interceptor';
import { MessageFormatPipe } from './shared/pipes/message-format.pipe';

import { NavbarComponent } from './shared/components/navbar/navbar.component';
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

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    MessageFormatPipe,
    LoginComponent,
    ForcePasswordChangeComponent,
    ResetPasswordComponent,
    Verify2FAComponent,
    DashboardComponent,
    UsersComponent,
    MachinesComponent,
    TasksComponent,
    ReportsComponent,
    AiPredictionsComponent,
    AiChatComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
