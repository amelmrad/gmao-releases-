import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TaskService } from '../../../core/services/task.service';
import { AuthUser } from '../../../models/user.model';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

interface MaintenanceAlert {
  machineId: number;
  machineName: string;
  maintenanceDate: string;
  status: string;
  overdue: boolean;
  daysUntil: number;
  priority?: 'Low' | 'Medium' | 'High';
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: AuthUser | null = null;
  isCollapsed = false;
  maintenanceAlerts: MaintenanceAlert[] = [];
  showAlertDropdown = false;
  hovering = false; // <-- new property for hover
  theme: 'light' | 'dark' = 'light';
  private readonly THEME_KEY = 'gmao-theme';
  private alertSub?: Subscription;

  navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'bi-speedometer2', route: '/dashboard', roles: ['ADMIN', 'RESPONSABLE', 'TECHNICIAN'] },
    { label: 'Utilisateurs', icon: 'bi-people-fill', route: '/users', roles: ['ADMIN'] },
    { label: 'Machines', icon: 'bi-gear-wide-connected', route: '/machines', roles: ['ADMIN', 'RESPONSABLE', 'TECHNICIAN'] },
    { label: 'Tâches', icon: 'bi-check2-square', route: '/tasks', roles: ['ADMIN', 'RESPONSABLE', 'TECHNICIAN'] },
    { label: 'Rapports', icon: 'bi-bar-chart-line-fill', route: '/reports', roles: ['ADMIN'] },
    { label: 'Prédictions IA', icon: 'bi-lightning-fill', route: '/ai-predictions', roles: ['RESPONSABLE']},
    { label: 'Chat IA', icon: 'bi-robot', route: '/ai-chat', roles: ['ADMIN', 'RESPONSABLE'] },
    { label: 'Paramètres', icon: 'bi-gear-fill', route: '/settings', roles: ['ADMIN', 'RESPONSABLE', 'TECHNICIAN'] },
  ];

  constructor(
    public authService: AuthService,
    private router: Router,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    this.initTheme();
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.startAlertPolling();
      }
    });
  }

  private initTheme(): void {
    const saved = localStorage.getItem(this.THEME_KEY) as 'light' | 'dark' | null;
    const attr = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    this.theme = saved ?? attr ?? (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem(this.THEME_KEY, this.theme);
  }

  ngOnDestroy(): void {
    this.alertSub?.unsubscribe();
  }

  private startAlertPolling(): void {
    this.alertSub = interval(5 * 60 * 1000).pipe(
      startWith(0),
      switchMap(() => this.taskService.getMaintenanceAlerts())
    ).subscribe({
      next: (res) => {
        this.maintenanceAlerts = res.data || [];
      },
      error: () => { }
    });
  }

  get filteredNavItems(): NavItem[] {
    const role = this.currentUser?.role || '';
    return this.navItems.filter(item => item.roles.includes(role));
  }

  get alertCount(): number {
    return this.maintenanceAlerts.length;
  }

  get overdueCount(): number {
    return this.maintenanceAlerts.filter(a => a.overdue).length;
  }

  toggleAlertDropdown(): void {
    this.showAlertDropdown = !this.showAlertDropdown;
  }

  closeAlertDropdown(): void {
    this.showAlertDropdown = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getRoleLabel(): string {
    const map: Record<string, string> = {
      ADMIN: 'Administrateur',
      RESPONSABLE: 'Responsable',
      TECHNICIAN: 'Technicien'
    };
    return map[this.currentUser?.role || ''] || '';
  }

  getRoleBadgeClass(): string {
    const map: Record<string, string> = {
      ADMIN: 'role-admin',
      RESPONSABLE: 'role-responsable',
      TECHNICIAN: 'role-tech'
    };
    return map[this.currentUser?.role || ''] || '';
  }

  getPriorityClass(priority: string | undefined): string {
    switch(priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return '';
    }
  }
}