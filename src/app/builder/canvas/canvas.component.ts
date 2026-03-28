import { Component, ElementRef, ViewChild, inject, AfterViewInit, Renderer2, effect, OnDestroy, PLATFORM_ID, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { BuilderService } from '../builder.service';
import { PageService, Attachment } from '../page.service';
import { MatIconModule } from '@angular/material/icon';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, DragDropModule, MatIconModule],
  template: `
    <div 
      #canvasContainer
      class="w-full min-h-[800px] bg-white relative outline-none"
      (click)="onCanvasClick($event)"
      (keydown.enter)="onCanvasClick($event)"
      tabindex="0"
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)"
      cdkDropList
      (cdkDropListDropped)="onCdkDrop($event)"
    ></div>
    
    <!-- Selection Overlay with Actions -->
    @if (builderService.selectedElement(); as el) {
      <div 
        class="absolute z-50 flex items-center gap-1 bg-blue-600 rounded-md shadow-lg p-1 transform -translate-y-full -translate-x-1/2"
        [style.top.px]="getRelativeTop(el)"
        [style.left.px]="getRelativeLeft(el)"
      >
        <button (click)="moveUp($event)" class="text-white hover:bg-blue-700 p-1 rounded" title="Move Up">
          <mat-icon class="text-sm">arrow_upward</mat-icon>
        </button>
        <button (click)="moveDown($event)" class="text-white hover:bg-blue-700 p-1 rounded" title="Move Down">
          <mat-icon class="text-sm">arrow_downward</mat-icon>
        </button>
        <div class="w-px h-4 bg-blue-400 mx-1"></div>
        <button (click)="deleteElement($event)" class="text-white hover:bg-red-600 p-1 rounded" title="Delete">
          <mat-icon class="text-sm">delete</mat-icon>
        </button>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
    /* Add some basic styles for the canvas content to look decent even when empty */
    ::ng-deep .canvas-empty-placeholder {
      border: 2px dashed #e5e7eb;
      padding: 2rem;
      text-align: center;
      color: #9ca3af;
      border-radius: 0.5rem;
      margin: 1rem;
    }
    
    /* Highlight hover target */
    ::ng-deep .drop-target {
      outline: 2px dashed #3b82f6 !important;
      outline-offset: -2px;
      background-color: rgba(59, 130, 246, 0.05);
    }

    /* Selected element style */
    ::ng-deep .selected-element {
      outline: 2px solid #2563eb !important;
      outline-offset: -2px;
      position: relative;
    }
  `]
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;
  
  builderService = inject(BuilderService);
  pageService = inject(PageService);
  renderer = inject(Renderer2);
  platformId = inject(PLATFORM_ID);
  
  // We use a getter to bind the HTML content
  // Note: In a real app, we'd sanitize this properly or use a safe pipe.
  // For a builder, we often need raw HTML.
  // get sanitizedHtml() {
  //   // In Angular, [innerHTML] automatically sanitizes. 
  //   // If we need scripts/styles, we'd need DomSanitizer.bypassSecurityTrustHtml
  //   // For now, let's assume the service provides safe HTML or we trust it.
  //   return this.builderService.htmlContent();
  // }

  private isInternalUpdate = false;
  private mutationObserver: MutationObserver | null = null;

  currentAttachments = computed(() => {
    const pageId = this.pageService.currentPageId();
    if (!pageId) return [];
    const page = this.pageService.pages().find(p => p.id === pageId);
    return page?.attachments || [];
  });

  constructor() {
    // Effect to handle attachments injection
    effect(() => {
      const attachments = this.currentAttachments();
      if (isPlatformBrowser(this.platformId) && this.canvasContainer) {
        this.injectAttachments(attachments);
      }
    });

    // Effect to update canvas when HTML changes from outside (e.g. code editor)
    effect(() => {
      const html = this.builderService.htmlContent();
      // If the update originated from within the canvas (MutationObserver), skip re-rendering
      if (this.isInternalUpdate) return;

      if (this.canvasContainer && isPlatformBrowser(this.platformId)) {
         // Parse the full HTML to extract body content
         const parser = new DOMParser();
         const doc = parser.parseFromString(html, 'text/html');
         const bodyContent = doc.body.innerHTML;
         
         const currentClean = this.getCleanHtml(this.canvasContainer.nativeElement);
         
         // Compare with current canvas content to avoid unnecessary updates
         if (currentClean !== bodyContent) {
             this.canvasContainer.nativeElement.innerHTML = bodyContent;
             // Re-inject attachments since innerHTML wiped them out
             this.injectAttachments(this.currentAttachments());
             this.renderCharts();
         }
      }
    });

    // Effect to handle selection changes (e.g. from Navigator)
    effect(() => {
      const selected = this.builderService.selectedElement();
      // Only attempt to update DOM if view is initialized
      if (this.canvasContainer) {
        this.clearSelection();
        if (selected) {
          selected.classList.add('selected-element');
        }
      }
    });

    // Effect to handle content editable state
    effect(() => {
      const selected = this.builderService.selectedElement();
      const editable = this.builderService.isContentEditable();

      if (this.canvasContainer) {
        // Remove contenteditable from all elements first to be safe
        const allEditable = this.canvasContainer.nativeElement.querySelectorAll('[contenteditable]');
        allEditable.forEach(el => el.removeAttribute('contenteditable'));

        if (selected && editable) {
          selected.setAttribute('contenteditable', 'true');
          selected.focus();
        }
      }
    });

    // Effect to toggle MutationObserver based on Code Editor visibility
    effect(() => {
      const showEditor = this.builderService.showCodeEditor();
      if (showEditor) {
        this.mutationObserver?.disconnect();
      } else {
        // Re-connect if it was disconnected and we are in the browser
        if (this.mutationObserver && this.canvasContainer) {
          this.mutationObserver.observe(this.canvasContainer.nativeElement, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
          });
        }
      }
    });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Initialize MutationObserver to detect changes inside the canvas
    // and update the service's HTML content
    if (typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver(() => {
        // If code editor is open, we ignore mutations (double safety, though disconnect should handle it)
        if (this.builderService.showCodeEditor()) return;

        if (this.canvasContainer) {
          this.renderCharts();
          this.isInternalUpdate = true;
          const cleanHtml = this.getCleanHtml(this.canvasContainer.nativeElement);
          this.builderService.updateBodyContent(cleanHtml);
          // Reset flag after a microtask to allow signal propagation
          setTimeout(() => this.isInternalUpdate = false, 0);
        }
      });

      // Only observe if editor is NOT open initially
      if (!this.builderService.showCodeEditor()) {
        this.mutationObserver.observe(this.canvasContainer.nativeElement, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true
        });
      }
    }
    
    // Set initial root
    this.builderService.rootElement.set(this.canvasContainer.nativeElement);
    
    // Initial render
    // We need to parse initial content too
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.builderService.htmlContent(), 'text/html');
    this.canvasContainer.nativeElement.innerHTML = doc.body.innerHTML;
    this.injectAttachments(this.currentAttachments());
    this.renderCharts();
  }

  injectAttachments(attachments: Attachment[]) {
    if (!this.canvasContainer || !isPlatformBrowser(this.platformId)) return;
    
    // Remove old injected attachments
    const oldInjected = this.canvasContainer.nativeElement.querySelectorAll('.canvas-injected-attachment');
    oldInjected.forEach(el => el.remove());
    
    // Inject new ones
    attachments.forEach(att => {
      if (att.type === 'css') {
        const style = document.createElement('style');
        style.className = 'canvas-injected-attachment';
        style.id = `attachment-${att.id}`;
        style.textContent = att.content;
        this.canvasContainer.nativeElement.appendChild(style);
      } else if (att.type === 'js') {
        const script = document.createElement('script');
        script.className = 'canvas-injected-attachment';
        script.id = `attachment-${att.id}`;
        script.textContent = att.content;
        this.canvasContainer.nativeElement.appendChild(script);
      }
    });
  }

  getCleanHtml(el: HTMLElement): string {
    const clone = el.cloneNode(true) as HTMLElement;
    const selected = clone.querySelector('.selected-element');
    if (selected) {
      selected.classList.remove('selected-element');
    }
    clone.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('.canvas-injected-attachment').forEach(el => el.remove());
    // Remove rendered hash so it re-renders on load
    clone.querySelectorAll('[data-rendered-hash]').forEach(el => el.removeAttribute('data-rendered-hash'));
    return clone.innerHTML;
  }

  ngOnDestroy() {
    this.mutationObserver?.disconnect();
  }

  onCanvasClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    let target = event.target as HTMLElement;
    
    // If clicking inside a chart, select the chart container instead
    const chartContainer = target.closest('[data-component-chart="true"], [data-component-dymer-chart="true"]');
    if (chartContainer) {
      target = chartContainer as HTMLElement;
    }
    
    // Don't select the container itself if possible, unless it's empty
    if (target === this.canvasContainer.nativeElement) {
      this.builderService.selectElement(null);
      this.clearSelection();
      return;
    }

    // Handle selection visual
    this.clearSelection();
    target.classList.add('selected-element');
    this.builderService.selectElement(target);
  }

  clearSelection() {
    if (!this.canvasContainer) return;
    const prev = this.canvasContainer.nativeElement.querySelector('.selected-element');
    if (prev) {
      prev.classList.remove('selected-element');
    }
  }

  getElementRect(el: HTMLElement): DOMRect {
    return el.getBoundingClientRect();
  }

  getRelativeTop(el: HTMLElement): number {
    if (!this.canvasContainer) return 0;
    const containerRect = this.canvasContainer.nativeElement.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return elRect.top - containerRect.top + this.canvasContainer.nativeElement.scrollTop - 10;
  }

  getRelativeLeft(el: HTMLElement): number {
    if (!this.canvasContainer) return 0;
    const containerRect = this.canvasContainer.nativeElement.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return elRect.left - containerRect.left + this.canvasContainer.nativeElement.scrollLeft + (elRect.width / 2);
  }

  moveUp(event: Event) {
    event.stopPropagation();
    this.builderService.moveSelectedElementUp();
  }

  moveDown(event: Event) {
    event.stopPropagation();
    this.builderService.moveSelectedElementDown();
  }

  deleteElement(event: Event) {
    event.stopPropagation();
    if (confirm('Delete this element?')) {
      this.builderService.deleteSelectedElement();
    }
  }

  // Drag and Drop Handlers
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    const target = event.target as HTMLElement;
    
    // Visual feedback
    this.clearDropTargets();
    if (target !== this.canvasContainer.nativeElement) {
      target.classList.add('drop-target');
    }
  }

  clearDropTargets() {
    const targets = this.canvasContainer.nativeElement.querySelectorAll('.drop-target');
    targets.forEach(t => t.classList.remove('drop-target'));
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.clearDropTargets();
    
    // This handles native drops if we used native dragstart.
    // But we are using CDK Drag.
    // CDK Drag doesn't fire native 'drop' event with data transfer in the same way 
    // unless we bridge it.
    // However, since we used cdkDropList on the container, 
    // onCdkDrop should trigger.
  }

  onCdkDrop(event: CdkDragDrop<unknown>) {
    // Get the data from the dragged item
    const item = event.item.data as { html: string };
    if (!item || !item.html) return;

    // We need to find WHERE it was dropped.
    // CDK DropList is usually for lists. 
    // For a free-form canvas, we need the mouse position to find the target element.
    // CDK doesn't give us the target element inside the drop list easily.
    // We can use document.elementFromPoint
    
    const clientX = event.dropPoint.x;
    const clientY = event.dropPoint.y;
    
    // Temporarily hide the dragged preview so we can find the element under it
    // (CDK preview might block the element)
    // Actually CDK handles this usually.
    
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement;
    
    if (target && this.canvasContainer.nativeElement.contains(target)) {
      // Create the new element
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = item.html;
      const newElement = tempDiv.firstElementChild as HTMLElement;
      
      if (newElement) {
        // Insert logic:
        // If target is a container (div, section, etc), append to it.
        // If target is a leaf (img, input), insert after it.
        // This is a simplified logic.
        
        const isContainer = ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE', 'HEADER', 'FOOTER'].includes(target.tagName);
        
        if (isContainer) {
          target.appendChild(newElement);
        } else {
          target.parentElement?.insertBefore(newElement, target.nextSibling);
        }
        
        // Update the service HTML
        this.updateServiceHtml();
        
        // Select the new element
        setTimeout(() => {
            this.clearSelection();
            newElement.classList.add('selected-element');
            this.builderService.selectElement(newElement);
        }, 0);
      }
    }
  }
  
  updateServiceHtml() {
    // Clean up classes before saving
    const clone = this.canvasContainer.nativeElement.cloneNode(true) as HTMLElement;
    const selected = clone.querySelector('.selected-element');
    if (selected) selected.classList.remove('selected-element');
    clone.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('.canvas-injected-attachment').forEach(el => el.remove());
    // Remove rendered hash so it re-renders on load
    clone.querySelectorAll('[data-rendered-hash]').forEach(el => el.removeAttribute('data-rendered-hash'));
    
    this.builderService.updateBodyContent(clone.innerHTML);
  }

  renderCharts() {
    if (!this.canvasContainer || !isPlatformBrowser(this.platformId)) return;
    
    const dymerCharts = this.canvasContainer.nativeElement.querySelectorAll('[data-component-dymer-chart="true"]');
    dymerCharts.forEach((chartEl: Element) => {
      const el = chartEl as HTMLElement;
      const type = el.getAttribute('data-chart-type');
      const dataSource = el.getAttribute('data-datasource');
      const labelField = el.getAttribute('data-label-field');
      const valueField = el.getAttribute('data-value-field');
      const title = el.getAttribute('data-title') || 'Services benchmark';
      
      const configHash = `${type}|${dataSource}|${labelField}|${valueField}|${title}`;
      if (el.getAttribute('data-rendered-hash') === configHash) {
        return;
      }
      
      el.setAttribute('data-rendered-hash', configHash);
      
      if (type === 'horizontal-bar') {
        this.renderDymerHorizontalBar(el, dataSource, labelField, valueField, title);
      }
    });

    const standardCharts = this.canvasContainer.nativeElement.querySelectorAll('[data-component-chart="true"]');
    standardCharts.forEach((chartEl: Element) => {
      const el = chartEl as HTMLElement;
      const type = el.getAttribute('data-chart-type') || 'bar';
      const dataSource = el.getAttribute('data-datasource');
      const labelField = el.getAttribute('data-label-field');
      const valueField = el.getAttribute('data-value-field');
      
      const configHash = `chartjs|${type}|${dataSource}|${labelField}|${valueField}`;
      if (el.getAttribute('data-rendered-hash') === configHash) {
        return;
      }
      
      el.setAttribute('data-rendered-hash', configHash);
      this.renderChartJs(el, type, dataSource, labelField, valueField);
    });
  }

  async renderChartJs(el: HTMLElement, type: string, dataSource: string | null, labelField: string | null, valueField: string | null) {
    let canvas = el.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      el.insertBefore(canvas, el.firstChild);
    }
    
    // Destroy existing chart instance if any
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    if (!dataSource || !labelField) {
      return;
    }

    try {
      const response = await fetch(dataSource);
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.features || data.data || data.items || []);
      
      const resolvePath = (obj: Record<string, unknown>, path: string) => {
        return path.split('.').reduce((prev: unknown, curr: string) => {
          if (prev && typeof prev === 'object' && curr in prev) {
            return (prev as Record<string, unknown>)[curr];
          }
          return undefined;
        }, obj);
      };
      
      const aggregates: Record<string, number> = {};
      items.forEach((item: Record<string, unknown>) => {
        const rawLabel = resolvePath(item, labelField);
        const label = rawLabel !== undefined && rawLabel !== null ? String(rawLabel) : 'Unknown';
        let value = 1;
        if (valueField) {
          const rawValue = resolvePath(item, valueField);
          value = Number(rawValue) || 0;
        }
        aggregates[label] = (aggregates[label] || 0) + value;
      });

      const chartType = type === 'gauge' ? 'doughnut' : type;
      const options: Record<string, unknown> = {
        responsive: true,
        maintainAspectRatio: false,
      };

      if (type === 'gauge') {
        options['circumference'] = 180;
        options['rotation'] = -90;
      }

      new Chart(canvas, {
        type: chartType as 'bar' | 'line' | 'pie' | 'doughnut',
        data: {
          labels: Object.keys(aggregates),
          datasets: [{
            label: 'Dataset',
            data: Object.values(aggregates),
            borderWidth: 1
          }]
        },
        options
      });
      
    } catch (error) {
      console.error('Error rendering Chart.js:', error);
    }
  }

  async renderDymerHorizontalBar(el: HTMLElement, dataSource: string | null, labelField: string | null, valueField: string | null, title: string) {
    if (!dataSource || !labelField) {
      el.innerHTML = `
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-gray-900 m-0">${title}</h3>
          <span class="bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full border border-blue-100">Total: 0</span>
        </div>
        <div class="space-y-4 text-center text-gray-500 py-4">
          Please configure Data Source URL and Label Field in properties.
        </div>
      `;
      return;
    }

    // Show loading state
    el.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-bold text-gray-900 m-0">${title}</h3>
      </div>
      <div class="flex justify-center items-center py-8">
        <mat-icon class="animate-spin text-blue-500 text-4xl w-10 h-10">refresh</mat-icon>
      </div>
    `;

    try {
      const response = await fetch(dataSource);
      const data = await response.json();
      
      const items = Array.isArray(data) ? data : (data.features || data.data || data.items || []);
      
      const resolvePath = (obj: Record<string, unknown>, path: string) => {
        return path.split('.').reduce((prev: unknown, curr: string) => {
          if (prev && typeof prev === 'object' && curr in prev) {
            return (prev as Record<string, unknown>)[curr];
          }
          return undefined;
        }, obj);
      };
      
      const aggregates: Record<string, number> = {};
      let total = 0;
      
      items.forEach((item: Record<string, unknown>) => {
        const rawLabel = resolvePath(item, labelField);
        const label = rawLabel !== undefined && rawLabel !== null ? String(rawLabel) : 'Unknown';
        
        let value = 1;
        if (valueField) {
          const rawValue = resolvePath(item, valueField);
          value = Number(rawValue) || 0;
        }
        
        aggregates[label] = (aggregates[label] || 0) + value;
        total += value;
      });
      
      const maxVal = Math.max(...Object.values(aggregates), 1);
      
      let barsHtml = '';
      const colors = ['bg-blue-600', 'bg-blue-500', 'bg-blue-400', 'bg-blue-300', 'bg-indigo-500', 'bg-indigo-400'];
      
      Object.entries(aggregates).forEach(([label, value], index) => {
        const percentage = (value / maxVal) * 100;
        const colorClass = colors[index % colors.length];
        
        barsHtml += `
          <div class="flex items-center gap-4">
            <div class="w-24 text-sm font-bold text-gray-600 truncate" title="${label}">${label}</div>
            <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full ${colorClass} rounded-full" style="width: ${percentage}%"></div>
            </div>
            <div class="w-12 text-right text-sm text-gray-600">${value}</div>
          </div>
        `;
      });
      
      el.innerHTML = `
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-gray-900 m-0">${title}</h3>
          <span class="bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full border border-blue-100">Total: ${total}</span>
        </div>
        <div class="space-y-4">
          ${barsHtml}
        </div>
        <div class="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
          Benchmark = numero servizi filtrati per ${labelField}.
        </div>
      `;
      
    } catch (error) {
      console.error('Error rendering chart:', error);
      el.innerHTML = `
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-gray-900 m-0">${title}</h3>
        </div>
        <div class="space-y-4 text-center text-red-500 py-4">
          Failed to load data from ${dataSource}
        </div>
      `;
    }
  }
}
