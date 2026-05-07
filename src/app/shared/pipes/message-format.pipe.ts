import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'messageFormat' })
export class MessageFormatPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';

    let formatted = value
      // Escape HTML first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Convert newlines to <br>
      .replace(/\n/g, '<br>')
      // Bold **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Highlight numbers followed by °C, mm/s, h
      .replace(/(\d+\.?\d*)(°C|mm\/s| h\b|%)/g, '<span class="metric">$1$2</span>')
      // Bullet points starting with •
      .replace(/• /g, '<span class="bullet">•</span> ');

    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
}
