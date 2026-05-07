import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { AiService } from '../../core/services/ai.service';
import { MachineService } from '../../core/services/machine.service';
import { AiChatMessage } from '../../models/ai.model';
import { Machine } from '../../models/machine.model';

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss']
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatBody') chatBodyRef!: ElementRef;

  messages: AiChatMessage[] = [];
  machines: Machine[] = [];
  selectedMachineId: number | null = null;
  selectedMode: string | null = null;
  userInput = '';
  loading = false;
  private shouldScroll = false;

  responseModes = [
    { value: 'DIAGNOSIS', label: 'Diagnostic / Dépannage', icon: 'bi-search' },
    { value: 'PREVENTIVE', label: 'Maintenance préventive', icon: 'bi-calendar-check' },
    { value: 'DATASHEET', label: 'Fiche technique', icon: 'bi-file-earmark-text' },
    { value: 'SPARE_PARTS', label: 'Pièces de rechange', icon: 'bi-box-seam' },
    { value: 'OPERATOR_QA', label: 'Questions opérateur', icon: 'bi-chat-square-quote' }
  ];

  quickQuestions = [
    'Quelles machines sont actuellement en panne ou à risque critique ?',
    'Montre-moi les tâches de haute priorité en cours',
    'Quel technicien est le plus surchargé ?',
    'Donne-moi un résumé complet de l\'état du parc machines',
    'Y a-t-il des tâches en retard ou proches de leur échéance ?',
    'Quelles sont les recommandations de maintenance urgentes ?'
  ];

  constructor(
    private aiService: AiService,
    private machineService: MachineService
  ) {}

  ngOnInit(): void {
    this.machineService.getAll().subscribe({
      next: (res) => { this.machines = res.data || []; }
    });

    // Message de bienvenue
    this.messages.push({
      role: 'ai',
      content: `Bonjour ! Je suis votre assistant IA GMAO, propulsé par Mistral AI. Je peux vous aider avec :
• Analyse en temps réel de l'état des machines et évaluation des risques
• Suivi des tâches de maintenance et charge des techniciens
• Prédictions de pannes et recommandations intelligentes
• Réponses en langage naturel à toutes vos questions sur le parc industriel

Posez-moi n'importe quelle question, ou sélectionnez une machine pour une analyse ciblée.`,
      severity: 'INFO',
      timestamp: new Date()
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  sendMessage(): void {
    const msg = this.userInput.trim();
    if (!msg || this.loading) return;

    this.messages.push({ role: 'user', content: msg, timestamp: new Date() });
    this.userInput = '';
    this.loading = true;
    this.shouldScroll = true;

    this.aiService.chat(msg, this.selectedMachineId || undefined, this.selectedMode || undefined).subscribe({
      next: (res) => {
        const data = res.data;
        this.messages.push({
          role: 'ai',
          content: data.message,
          severity: data.severity,
          timestamp: new Date(data.timestamp || new Date())
        });
        this.loading = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.messages.push({
          role: 'ai',
          content: 'Désolé, j\'ai rencontré une erreur. Veuillez réessayer.',
          severity: 'INFO',
          timestamp: new Date()
        });
        this.loading = false;
        this.shouldScroll = true;
      }
    });
  }

  useQuickQuestion(q: string): void {
    this.userInput = q;
    this.sendMessage();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.messages = [{
      role: 'ai',
      content: 'Discussion effacée. Comment puis-je vous aider avec vos machines ?',
      severity: 'INFO',
      timestamp: new Date()
    }];
  }

  private scrollToBottom(): void {
    try {
      if (this.chatBodyRef) {
        this.chatBodyRef.nativeElement.scrollTop = this.chatBodyRef.nativeElement.scrollHeight;
      }
    } catch {}
  }

  getSeverityClass(sev?: string): string {
    if (!sev) return '';
    return sev.toLowerCase();
  }

  get selectedMachineName(): string {
    if (!this.selectedMachineId) return 'Toutes les machines';
    return this.machines.find(m => m.id === this.selectedMachineId)?.name || '';
  }

  get selectedModeName(): string {
    if (!this.selectedMode) return 'Général';
    return this.responseModes.find(m => m.value === this.selectedMode)?.label || 'Général';
  }
}