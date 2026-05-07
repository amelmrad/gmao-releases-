import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { ReportService } from '../../core/services/report.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, AfterViewInit {
  @ViewChild('completionChart') completionChartRef!: ElementRef;
  @ViewChild('machineHealthChart') machineHealthRef!: ElementRef;

  report: any = null;
  loading = false;
  downloading = false;

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    this.loadReport();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initCharts(), 500);
  }

  loadReport(): void {
    this.loading = true;
    this.reportService.getFullReport().subscribe({
      next: (res) => {
        this.report = res.data;
        this.loading = false;
        setTimeout(() => this.initCharts(), 300);
      },
      error: () => { this.loading = false; }
    });
  }

  initCharts(): void {
    if (!this.report) return;
    const stats = this.report.stats;

    if (this.completionChartRef) {
      const ctx = this.completionChartRef.nativeElement.getContext('2d');
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Terminées/Approuvées', 'En cours', 'En attente'],
          datasets: [{
            data: [stats.completedTasks, stats.inProgressTasks, stats.pendingTasks],
            backgroundColor: [
              'rgba(164, 196, 148,0.8)',
              'rgba(202, 37, 182,0.8)',
              'rgba(245,158,11,0.8)'
            ],
            borderColor: '#ffffff',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#4a5568', padding: 12, font: { size: 11 } }
            }
          }
        }
      });
    }

    if (this.machineHealthRef) {
      const ctx2 = this.machineHealthRef.nativeElement.getContext('2d');
      new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['Opérationnelles', 'En maintenance', 'En panne', 'Inactives'],
          datasets: [{
            data: [stats.operationalMachines, stats.maintenanceMachines, stats.brokenMachines, stats.idleMachines],
            backgroundColor: [
              'rgba(164, 196, 148,0.8)',
              'rgba(245,158,11,0.8)',
              'rgba(231,76,60,0.8)',
              'rgba(158,158,158,0.8)'
            ],
            borderColor: '#ffffff',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#4a5568', padding: 12, font: { size: 11 } }
            }
          }
        }
      });
    }
  }

  /**
   * Génère et télécharge directement un rapport PDF en utilisant jsPDF.
   * Sans dialogue d'impression — déclenche un téléchargement immédiat dans le navigateur.
   */
  async exportPDF(): Promise<void> {
    if (!this.report) return;
    this.downloading = true;

    try {
      // Import dynamique de jsPDF pour éviter les problèmes de compilation
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const stats = this.report.stats;
      const generated = new Date().toLocaleString();
      const pageW = doc.internal.pageSize.getWidth();

      // ---- En-tête ----
      doc.setFillColor(15, 20, 25);
      doc.rect(0, 0, pageW, 30, 'F');
      doc.setTextColor(0, 180, 216);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Rapport GMAO Système', 14, 18);
      doc.setTextColor(136, 153, 166);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Généré : ${generated}`, 14, 25);

      let y = 40;

      // ---- Statistiques des machines ----
      doc.setTextColor(0, 180, 216);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('État des machines', 14, y);
      y += 6;

      doc.setDrawColor(0, 180, 216);
      doc.setLineWidth(0.3);
      doc.line(14, y, pageW - 14, y);
      y += 6;

      const machineRows = [
        ['Total machines', String(stats.totalMachines)],
        ['Opérationnelles', String(stats.operationalMachines)],
        ['En maintenance', String(stats.maintenanceMachines)],
        ['En panne', String(stats.brokenMachines)],
        ['Inactives', String(stats.idleMachines)],
        ['Taux de santé des machines', `${this.machineHealthRate}%`]
      ];

      this.renderTable(doc, machineRows, y);
      y += machineRows.length * 8 + 10;

      // ---- Résumé des tâches ----
      doc.setTextColor(0, 180, 216);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Résumé des tâches', 14, y);
      y += 6;
      doc.line(14, y, pageW - 14, y);
      y += 6;

      const pendingApproval = this.report.pendingApprovalTasks || 0;
      const taskRows = [
        ['Total tâches', String(stats.totalTasks)],
        ['En attente', String(stats.pendingTasks)],
        ['En cours', String(stats.inProgressTasks)],
        ['En attente d\'approbation', String(pendingApproval)],
        ['Terminées / Approuvées', String(stats.completedTasks)],
        ['Taux d\'achèvement des tâches', `${this.taskCompletionRate}%`]
      ];

      this.renderTable(doc, taskRows, y);
      y += taskRows.length * 8 + 10;

      // ---- Pied de page ----
      const pageH = doc.internal.pageSize.getHeight();
      doc.setTextColor(84, 110, 122);
      doc.setFontSize(8);
      doc.text('GMAO — Système Intelligent de Gestion de Maintenance', 14, pageH - 8);
      doc.text(`Page 1`, pageW - 24, pageH - 8);

      // Téléchargement direct — sans dialogue d'impression
      doc.save(`rapport-gmao-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error('Erreur de génération PDF :', e);
      // Solution de secours : fenêtre d'impression si jsPDF échoue
      window.print();
    } finally {
      this.downloading = false;
    }
  }

  private renderTable(doc: any, rows: string[][], startY: number): void {
    const pageW = doc.internal.pageSize.getWidth();
    let y = startY;
    rows.forEach((row, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(26, 35, 50);
        doc.rect(14, y - 4, pageW - 28, 7.5, 'F');
      }
      doc.setTextColor(200, 214, 229);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(row[0], 16, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 180, 216);
      doc.text(row[1], pageW - 30, y, { align: 'right' });
      y += 8;
    });
  }

  get taskCompletionRate(): number {
    return +(this.report?.taskCompletionRate?.toFixed(1) || 0);
  }

  get machineHealthRate(): number {
    return +(this.report?.machineHealthRate?.toFixed(1) || 0);
  }
}