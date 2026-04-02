import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BuilderService } from '../builder.service';
import { MatIconModule } from '@angular/material/icon';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, CodemirrorModule],
  template: `
    <div class="flex flex-col h-full bg-gray-900 text-white font-mono text-sm">
      <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span class="font-semibold text-gray-300">HTML Source</span>
        <button (click)="close()" class="text-gray-400 hover:text-white">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <div class="flex-1 relative overflow-hidden flex flex-col">
        <ngx-codemirror 
          class="flex-1 overflow-hidden codemirror-wrapper"
          [ngModel]="htmlContent()" 
          (ngModelChange)="updateHtml($event)"
          [options]="{
            lineNumbers: true,
            theme: 'dracula',
            mode: 'htmlmixed'
          }"
        ></ngx-codemirror>
      </div>
      <div class="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-500">
        Pressing keys updates the canvas in real-time.
      </div>
    </div>
  `,
  styles: [`
    ::ng-deep .codemirror-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    ::ng-deep .codemirror-wrapper .CodeMirror {
      flex: 1;
      height: 100%;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 14px;
    }
  `]
})
export class CodeEditorComponent {
  builderService = inject(BuilderService);
  htmlContent = this.builderService.htmlContent;

  updateHtml(value: string) {
    this.builderService.updateContent(value);
  }

  close() {
    this.builderService.toggleCodeEditor();
  }
}
