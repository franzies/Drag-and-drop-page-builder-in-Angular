import { Component, inject, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from './sidebar/sidebar.component';
import { CanvasComponent } from './canvas/canvas.component';
import { PropertiesComponent } from './properties/properties.component';
import { CodeEditorComponent } from './code-editor/code-editor.component';
import { AiChatComponent } from './ai-chat/ai-chat.component';
import { BuilderService } from './builder.service';
import { PageService, Attachment } from './page.service';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, OnInit } from '@angular/core';

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent,
    CanvasComponent,
    PropertiesComponent,
    CodeEditorComponent,
    AiChatComponent,
    MatIconModule,
    DragDropModule,
    CodemirrorModule
  ],
  template: `
    <div class="flex h-screen bg-gray-100 overflow-hidden" cdkDropListGroup [class.dark]="isDarkMode" [class.select-none]="isResizingSidebar || isResizingRightPanel">
      <!-- Sidebar -->
      <app-sidebar 
        class="bg-white border-r border-gray-200 flex-shrink-0 dark:bg-gray-900 dark:border-gray-700"
        [style.width.px]="sidebarWidth"
        (requestCreatePage)="openNewPageModal()"
        (requestAttachFile)="openAttachModal($event)"
      ></app-sidebar>

      <!-- Sidebar Resizer -->
      <div 
        class="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-500 z-20 dark:bg-gray-700 dark:hover:bg-blue-500 transition-colors"
        [class.bg-blue-500]="isResizingSidebar"
        (mousedown)="startResizeSidebar($event)"
      ></div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-800">
        <!-- Toolbar -->
        <div class="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between flex-shrink-0 dark:bg-gray-900 dark:border-gray-700">
          <div class="flex items-center space-x-2">
            <h1 class="text-lg font-semibold text-gray-800 dark:text-white">VvvebJs Lite</h1>
          </div>
          
          <!-- Center: Breakpoints -->
          <div class="flex items-center bg-gray-100 rounded-lg p-1 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <button 
              (click)="setBreakpoint('mobile')" 
              class="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-700 dark:text-gray-400 transition-all"
              [class.bg-white]="currentBreakpoint === 'mobile'"
              [class.text-blue-600]="currentBreakpoint === 'mobile'"
              [class.shadow-sm]="currentBreakpoint === 'mobile'"
              [class.dark:bg-gray-700]="currentBreakpoint === 'mobile'"
              [class.dark:text-blue-400]="currentBreakpoint === 'mobile'"
              title="Mobile View"
            >
              <mat-icon class="text-sm">smartphone</mat-icon>
            </button>
            <button 
              (click)="setBreakpoint('tablet')" 
              class="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-700 dark:text-gray-400 transition-all"
              [class.bg-white]="currentBreakpoint === 'tablet'"
              [class.text-blue-600]="currentBreakpoint === 'tablet'"
              [class.shadow-sm]="currentBreakpoint === 'tablet'"
              [class.dark:bg-gray-700]="currentBreakpoint === 'tablet'"
              [class.dark:text-blue-400]="currentBreakpoint === 'tablet'"
              title="Tablet View"
            >
              <mat-icon class="text-sm">tablet_mac</mat-icon>
            </button>
            <button 
              (click)="setBreakpoint('desktop')" 
              class="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-700 dark:text-gray-400 transition-all"
              [class.bg-white]="currentBreakpoint === 'desktop'"
              [class.text-blue-600]="currentBreakpoint === 'desktop'"
              [class.shadow-sm]="currentBreakpoint === 'desktop'"
              [class.dark:bg-gray-700]="currentBreakpoint === 'desktop'"
              [class.dark:text-blue-400]="currentBreakpoint === 'desktop'"
              title="Desktop View"
            >
              <mat-icon class="text-sm">desktop_windows</mat-icon>
            </button>
          </div>

          <!-- Zoom & Pan Controls -->
          <div class="flex items-center bg-gray-100 rounded-lg p-1 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mx-2">
            <button 
              (click)="togglePanMode()" 
              class="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-700 dark:text-gray-400 transition-all"
              [class.bg-white]="isPanMode"
              [class.text-blue-600]="isPanMode"
              [class.shadow-sm]="isPanMode"
              title="Pan Tool"
            >
              <mat-icon class="text-sm">pan_tool</mat-icon>
            </button>
            <div class="w-px h-4 bg-gray-300 mx-1 dark:bg-gray-600"></div>
            <button 
              (click)="zoomOut()" 
              class="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-700 dark:text-gray-400 transition-all"
              title="Zoom Out"
            >
              <mat-icon class="text-sm">remove</mat-icon>
            </button>
            <span class="text-xs font-medium px-2 text-gray-600 dark:text-gray-300 w-12 text-center">{{ zoomLevel }}%</span>
            <button 
              (click)="zoomIn()" 
              class="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-700 dark:text-gray-400 transition-all"
              title="Zoom In"
            >
              <mat-icon class="text-sm">add</mat-icon>
            </button>
          </div>

          <div class="flex items-center space-x-2">
             <button (click)="toggleDarkMode()" class="p-2 hover:bg-gray-100 rounded-lg text-gray-600 dark:text-gray-300 dark:hover:bg-gray-700" title="Toggle Dark Mode">
              <mat-icon>{{ isDarkMode ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>
            <div class="w-px h-6 bg-gray-300 mx-2 dark:bg-gray-600"></div>
            <button (click)="togglePreview()" class="p-2 hover:bg-gray-100 rounded-lg text-gray-600 dark:text-gray-300 dark:hover:bg-gray-700" [class.bg-blue-100]="previewMode" [class.text-blue-600]="previewMode" title="Toggle Preview">
              <mat-icon>visibility</mat-icon>
            </button>
            <button (click)="toggleCode()" class="p-2 hover:bg-gray-100 rounded-lg text-gray-600 dark:text-gray-300 dark:hover:bg-gray-700" title="Toggle Code Editor">
              <mat-icon>code</mat-icon>
            </button>
            <button (click)="downloadZip()" class="p-2 hover:bg-gray-100 rounded-lg text-gray-600 dark:text-gray-300 dark:hover:bg-gray-700" title="Download ZIP">
              <mat-icon>download</mat-icon>
            </button>
            <button (click)="saveTemplate()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 transition-colors">
              <mat-icon class="text-sm">save</mat-icon> Save
            </button>
          </div>
        </div>

        <!-- Canvas Area -->
        <div class="flex-1 overflow-hidden relative bg-gray-50 flex dark:bg-gray-800">
          <div 
            #scrollContainer
            class="flex-1 overflow-auto p-8 flex justify-center bg-gray-100/50 dark:bg-gray-900/50" 
            [class.p-0]="previewMode" 
            [class.bg-white]="previewMode"
            [class.cursor-grab]="isPanMode && !isDragging"
            [class.cursor-grabbing]="isPanMode && isDragging"
            [class.pointer-events-none]="isResizingSidebar || isResizingRightPanel"
            (mousedown)="onPanStart($event)"
            (mousemove)="onPanMove($event)"
            (mouseup)="onPanEnd()"
            (mouseleave)="onPanEnd()"
          >
            <div 
              class="transition-all duration-300 ease-in-out bg-white shadow-sm rounded-lg dark:bg-black origin-top"
              [style.width]="getCanvasWidth()"
              [style.min-height]="previewMode ? '100%' : '800px'"
              [style.transform]="'scale(' + (zoomLevel / 100) + ')'"
              [class.shadow-none]="previewMode" 
              [class.rounded-none]="previewMode"
              [class.pointer-events-none]="isPanMode"
            >
               <app-canvas class="w-full block"></app-canvas>
            </div>
          </div>
          
          <!-- Code Editor Overlay/Panel -->
          @if (builderService.showCodeEditor()) {
            <app-code-editor class="w-1/2 border-l border-gray-200 bg-white h-full absolute right-0 top-0 bottom-0 shadow-xl z-20 dark:bg-gray-900 dark:border-gray-700"></app-code-editor>
          }

          <!-- Right Panel (Properties + AI Chat) -->
          @if (!previewMode) {
            <!-- Right Panel Resizer -->
            <div 
              class="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-500 z-20 dark:bg-gray-700 dark:hover:bg-blue-500 transition-colors"
              [class.bg-blue-500]="isResizingRightPanel"
              (mousedown)="startResizeRightPanel($event)"
            ></div>
            <div 
              class="bg-white border-l border-gray-200 flex flex-col flex-shrink-0 z-10 dark:bg-gray-900 dark:border-gray-700"
              [style.width.px]="rightPanelWidth"
            >
              <app-properties class="flex-1 overflow-hidden border-b border-gray-200 dark:border-gray-700"></app-properties>
              <app-ai-chat class="h-[40%] flex-shrink-0"></app-ai-chat>
            </div>
          }
        </div>
      </div>

      <!-- New Page Modal Overlay -->
      @if (showNewPageModal) {
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 dark:bg-gray-800 flex flex-col max-h-[90vh]">
            <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              <h3 class="font-semibold text-gray-800 dark:text-white">Create New Page</h3>
              <button (click)="closeNewPageModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="flex flex-1 overflow-hidden">
              <!-- Left: Form -->
              <div class="w-1/2 p-4 space-y-4 border-r border-gray-100 dark:border-gray-700 overflow-y-auto">
                <div>
                  <label for="pageName" class="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Page Name</label>
                  <input 
                    id="pageName"
                    [(ngModel)]="newPageData.name" 
                    type="text" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g. Contact Us"
                  >
                </div>
                
                <div>
                  <label for="pageSlug" class="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Index / Slug</label>
                  <input 
                    id="pageSlug"
                    [(ngModel)]="newPageData.slug" 
                    type="text" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g. contact-us"
                  >
                </div>
                
                <div>
                  <label for="pageDescription" class="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Description</label>
                  <textarea 
                    id="pageDescription"
                    [(ngModel)]="newPageData.description" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Brief description of the page..."
                  ></textarea>
                </div>
              </div>

              <!-- Right: Templates -->
              <div class="w-1/2 p-4 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto">
                <span class="block text-xs font-medium text-gray-700 mb-2 dark:text-gray-300">Choose Template</span>
                <div class="grid grid-cols-1 gap-3">
                  @for (template of templates; track template.id) {
                    <div 
                      class="border rounded-lg p-3 cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                      [class.border-blue-500]="newPageData.template === template.id"
                      [class.bg-blue-50]="newPageData.template === template.id"
                      [class.dark:bg-blue-900]="newPageData.template === template.id"
                      [class.border-gray-200]="newPageData.template !== template.id"
                      [class.bg-white]="newPageData.template !== template.id"
                      [class.dark:bg-gray-800]="newPageData.template !== template.id"
                      [class.dark:border-gray-700]="newPageData.template !== template.id"
                      (click)="newPageData.template = template.id"
                      (keydown.enter)="newPageData.template = template.id"
                      tabindex="0"
                    >
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <mat-icon>{{ template.icon }}</mat-icon>
                        </div>
                        <div>
                          <h4 class="text-sm font-medium text-gray-800 dark:text-white">{{ template.name }}</h4>
                          <p class="text-xs text-gray-500 dark:text-gray-400">{{ template.description }}</p>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
            
            <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 dark:bg-gray-700 dark:border-gray-600">
              <button (click)="closeNewPageModal()" class="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium dark:text-gray-300 dark:hover:text-white">Cancel</button>
              <button 
                (click)="saveNewPage()" 
                [disabled]="!newPageData.name || !newPageData.slug"
                class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                @if (isCreatingPage) {
                  <mat-icon class="animate-spin text-sm">refresh</mat-icon> Creating...
                } @else {
                  Create Page
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Attach File Modal Overlay -->
      @if (showAttachModal) {
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-[80vh] dark:bg-gray-800">
            <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              <h3 class="font-semibold text-gray-800 dark:text-white">Manage Assets</h3>
              <button (click)="closeAttachModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="flex flex-1 overflow-hidden">
              <!-- Left Column: File List -->
              <div class="w-1/3 border-r border-gray-200 dark:border-gray-600 flex flex-col bg-gray-50 dark:bg-gray-800">
                <div class="p-3 border-b border-gray-200 dark:border-gray-600 flex gap-2">
                  <button 
                    class="flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors"
                    [class.bg-blue-100]="attachModalData.activeTab === 'create'"
                    [class.text-blue-700]="attachModalData.activeTab === 'create'"
                    [class.bg-white]="attachModalData.activeTab !== 'create'"
                    [class.text-gray-600]="attachModalData.activeTab !== 'create'"
                    [class.border]="attachModalData.activeTab !== 'create'"
                    [class.border-gray-300]="attachModalData.activeTab !== 'create'"
                    [class.dark:bg-blue-900]="attachModalData.activeTab === 'create'"
                    [class.dark:text-blue-300]="attachModalData.activeTab === 'create'"
                    [class.dark:bg-gray-700]="attachModalData.activeTab !== 'create'"
                    [class.dark:text-gray-300]="attachModalData.activeTab !== 'create'"
                    [class.dark:border-gray-600]="attachModalData.activeTab !== 'create'"
                    (click)="setAttachTab('create')"
                  >
                    <mat-icon class="text-[16px] w-4 h-4 align-middle mr-1">add</mat-icon> New
                  </button>
                  <button 
                    class="flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors"
                    [class.bg-blue-100]="attachModalData.activeTab === 'upload'"
                    [class.text-blue-700]="attachModalData.activeTab === 'upload'"
                    [class.bg-white]="attachModalData.activeTab !== 'upload'"
                    [class.text-gray-600]="attachModalData.activeTab !== 'upload'"
                    [class.border]="attachModalData.activeTab !== 'upload'"
                    [class.border-gray-300]="attachModalData.activeTab !== 'upload'"
                    [class.dark:bg-blue-900]="attachModalData.activeTab === 'upload'"
                    [class.dark:text-blue-300]="attachModalData.activeTab === 'upload'"
                    [class.dark:bg-gray-700]="attachModalData.activeTab !== 'upload'"
                    [class.dark:text-gray-300]="attachModalData.activeTab !== 'upload'"
                    [class.dark:border-gray-600]="attachModalData.activeTab !== 'upload'"
                    (click)="setAttachTab('upload')"
                  >
                    <mat-icon class="text-[16px] w-4 h-4 align-middle mr-1">upload</mat-icon> Upload
                  </button>
                </div>
                
                <div class="flex-1 overflow-y-auto p-2 space-y-1">
                  @if (pageAttachments.length === 0) {
                    <div class="text-center p-4 text-sm text-gray-500 dark:text-gray-400 italic">
                      No assets attached to this page.
                    </div>
                  }
                  @for (attachment of pageAttachments; track attachment.id) {
                    <div 
                      class="flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors border"
                      [class.bg-blue-50]="attachModalData.selectedAttachmentId === attachment.id"
                      [class.border-blue-200]="attachModalData.selectedAttachmentId === attachment.id"
                      [class.bg-white]="attachModalData.selectedAttachmentId !== attachment.id"
                      [class.border-gray-200]="attachModalData.selectedAttachmentId !== attachment.id"
                      [class.hover:bg-gray-100]="attachModalData.selectedAttachmentId !== attachment.id"
                      [class.dark:bg-blue-900]="attachModalData.selectedAttachmentId === attachment.id"
                      [class.dark:border-blue-700]="attachModalData.selectedAttachmentId === attachment.id"
                      [class.dark:bg-gray-800]="attachModalData.selectedAttachmentId !== attachment.id"
                      [class.dark:border-gray-700]="attachModalData.selectedAttachmentId !== attachment.id"
                      [class.dark:hover:bg-gray-700]="attachModalData.selectedAttachmentId !== attachment.id"
                      (click)="selectAttachment(attachment)"
                      (keydown.enter)="selectAttachment(attachment)"
                      tabindex="0"
                    >
                      <div class="flex items-center gap-2 overflow-hidden">
                        <mat-icon class="text-gray-400 text-sm w-4 h-4">
                          {{ attachment.type === 'js' ? 'javascript' : 'css' }}
                        </mat-icon>
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate" [title]="attachment.name">
                          {{ attachment.name }}
                        </span>
                      </div>
                      <button 
                        (click)="deleteAttachment(attachment.id); $event.stopPropagation()" 
                        class="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Delete asset"
                      >
                        <mat-icon class="text-[16px] w-4 h-4">delete</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <!-- Right Column: Editor / Uploader -->
              <div class="w-2/3 flex flex-col bg-white dark:bg-gray-800">
                <div class="p-4 space-y-4 overflow-y-auto flex-1">
                  @if (attachModalData.activeTab === 'create' || attachModalData.activeTab === 'edit') {
                    <!-- File Type (Only for Create) -->
                    @if (attachModalData.activeTab === 'create') {
                      <div>
                        <span class="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">File Type</span>
                        <div class="flex gap-4">
                          <label class="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="fileType" value="js" [(ngModel)]="attachModalData.fileType" class="text-blue-600 focus:ring-blue-500">
                            <span class="text-sm text-gray-700 dark:text-gray-300">JavaScript (.js)</span>
                          </label>
                          <label class="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="fileType" value="css" [(ngModel)]="attachModalData.fileType" class="text-blue-600 focus:ring-blue-500">
                            <span class="text-sm text-gray-700 dark:text-gray-300">CSS (.css)</span>
                          </label>
                        </div>
                      </div>
                    }

                    <div>
                      <label for="fileName" class="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">File Name</label>
                      <input 
                        id="fileName"
                        [(ngModel)]="attachModalData.fileName" 
                        type="text" 
                        [disabled]="attachModalData.activeTab === 'edit'"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:disabled:bg-gray-600"
                        placeholder="e.g. custom-script"
                      >
                      @if (attachModalData.activeTab === 'create') {
                        <span class="text-xs text-gray-400 mt-1 block">Extension .{{attachModalData.fileType}} will be added automatically</span>
                      }
                    </div>
                    
                    <div class="flex-1 flex flex-col min-h-[300px] h-full border border-gray-300 rounded-md overflow-hidden dark:border-gray-600">
                      <div class="px-3 py-2 bg-gray-50 border-b border-gray-300 dark:bg-gray-700 dark:border-gray-600">
                        <span class="block text-xs font-medium text-gray-700 dark:text-gray-300">Code Content</span>
                      </div>
                      <ngx-codemirror 
                        class="flex-1 overflow-hidden codemirror-wrapper"
                        [(ngModel)]="attachModalData.fileContent" 
                        [options]="{
                          lineNumbers: true,
                          theme: 'dracula',
                          mode: attachModalData.fileType === 'js' ? 'javascript' : 'css'
                        }"
                      ></ngx-codemirror>
                    </div>
                  }

                  @if (attachModalData.activeTab === 'upload') {
                    <div>
                      <span class="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">File Type</span>
                      <div class="flex gap-4 mb-4">
                        <label class="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="fileType" value="js" [(ngModel)]="attachModalData.fileType" class="text-blue-600 focus:ring-blue-500">
                          <span class="text-sm text-gray-700 dark:text-gray-300">JavaScript (.js)</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="fileType" value="css" [(ngModel)]="attachModalData.fileType" class="text-blue-600 focus:ring-blue-500">
                          <span class="text-sm text-gray-700 dark:text-gray-300">CSS (.css)</span>
                        </label>
                      </div>
                    </div>
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors cursor-pointer relative dark:border-gray-600 dark:hover:bg-gray-700 mt-4">
                      <input 
                        type="file" 
                        (change)="onFileSelected($event)" 
                        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        [accept]="attachModalData.fileType === 'js' ? '.js' : '.css'"
                      >
                      <mat-icon class="text-gray-400 text-5xl mb-4">cloud_upload</mat-icon>
                      <p class="text-base text-gray-600 font-medium dark:text-gray-300">Click to upload or drag and drop</p>
                      <p class="text-sm text-gray-400 mt-2">
                        {{ attachModalData.selectedFile ? attachModalData.selectedFile.name : 'Supported: .' + attachModalData.fileType }}
                      </p>
                    </div>
                  }
                </div>
                
                <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 dark:bg-gray-700 dark:border-gray-600">
                  <button (click)="closeAttachModal()" class="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium dark:text-gray-300 dark:hover:text-white">Close</button>
                  <button 
                    (click)="saveAttachment()" 
                    [disabled]="!isValidAttachment()"
                    class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <mat-icon class="text-sm">save</mat-icon> {{ attachModalData.activeTab === 'edit' ? 'Update Asset' : 'Save Asset' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
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
export class BuilderComponent implements OnInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  builderService = inject(BuilderService);
  pageService = inject(PageService);
  http = inject(HttpClient);
  platformId = inject(PLATFORM_ID);
  
  previewMode = false;
  
  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // @ts-expect-error - CodeMirror mode imports do not have type definitions
      import('codemirror/mode/javascript/javascript');
      // @ts-expect-error - CodeMirror mode imports do not have type definitions
      import('codemirror/mode/css/css');
    }
  }
  
  // Resizing state
  sidebarWidth = 256; // 16rem (w-64)
  rightPanelWidth = 320; // 20rem (w-80)
  isResizingSidebar = false;
  isResizingRightPanel = false;

  startResizeSidebar(event: MouseEvent) {
    event.preventDefault();
    this.isResizingSidebar = true;
  }

  startResizeRightPanel(event: MouseEvent) {
    event.preventDefault();
    this.isResizingRightPanel = true;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isResizingSidebar) {
      this.sidebarWidth = Math.max(200, Math.min(event.clientX, 600));
    } else if (this.isResizingRightPanel) {
      const newWidth = window.innerWidth - event.clientX;
      this.rightPanelWidth = Math.max(250, Math.min(newWidth, 800));
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isResizingSidebar = false;
    this.isResizingRightPanel = false;
  }

  // Breakpoint state
  currentBreakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  
  // Dark mode state
  isDarkMode = false;

  // Zoom & Pan state
  zoomLevel = 100;
  isPanMode = false;
  isDragging = false;
  startX = 0;
  startY = 0;
  scrollLeft = 0;
  scrollTop = 0;

  showNewPageModal = false;
  isCreatingPage = false;
  
  newPageData = {
    name: '',
    slug: '',
    description: '',
    template: 'blank'
  };

  templates = [
    { id: 'blank', name: 'Blank Page', description: 'Start from scratch with an empty canvas', icon: 'check_box_outline_blank', file: null },
    { id: 'teaserlist', name: 'Teaser List', description: 'A list of article teasers with images', icon: 'view_list', file: '/templates/teaserlist.html' },
    { id: 'fullcontent', name: 'Full Content', description: 'A full article page with cover image', icon: 'article', file: '/templates/fullcontent.html' },
    { id: 'mappreview', name: 'Map Preview', description: 'Contact page with embedded map', icon: 'map', file: '/templates/mappreview.html' },
    { id: 'form', name: 'Contact Form', description: 'Ready-to-use contact form', icon: 'contact_mail', file: '/templates/form.html' }
  ];

  showAttachModal = false;
  attachModalData: {
    pageId: string;
    activeTab: 'create' | 'upload' | 'edit';
    fileType: 'js' | 'css';
    fileName: string;
    fileContent: string;
    selectedFile: File | null;
    selectedAttachmentId: string | null;
  } = {
    pageId: '',
    activeTab: 'create',
    fileType: 'js',
    fileName: '',
    fileContent: '',
    selectedFile: null,
    selectedAttachmentId: null
  };
  pageAttachments: Attachment[] = [];

  togglePreview() {
    this.previewMode = !this.previewMode;
  }

  toggleCode() {
    this.builderService.toggleCodeEditor();
  }
  
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  
  setBreakpoint(breakpoint: 'mobile' | 'tablet' | 'desktop') {
    this.currentBreakpoint = breakpoint;
  }
  
  getCanvasWidth(): string {
    if (this.previewMode) return '100%';
    
    switch (this.currentBreakpoint) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%'; // or '1024px' or max-w-5xl
      default: return '100%';
    }
  }

  zoomIn() {
    if (this.zoomLevel < 200) {
      this.zoomLevel += 10;
    }
  }

  zoomOut() {
    if (this.zoomLevel > 30) {
      this.zoomLevel -= 10;
    }
  }

  togglePanMode() {
    this.isPanMode = !this.isPanMode;
    if (!this.isPanMode) {
      this.isDragging = false;
    }
  }

  onPanStart(event: MouseEvent) {
    if (!this.isPanMode) return;
    this.isDragging = true;
    this.startX = event.pageX - this.scrollContainer.nativeElement.offsetLeft;
    this.startY = event.pageY - this.scrollContainer.nativeElement.offsetTop;
    this.scrollLeft = this.scrollContainer.nativeElement.scrollLeft;
    this.scrollTop = this.scrollContainer.nativeElement.scrollTop;
  }

  onPanMove(event: MouseEvent) {
    if (!this.isDragging || !this.isPanMode) return;
    event.preventDefault();
    const x = event.pageX - this.scrollContainer.nativeElement.offsetLeft;
    const y = event.pageY - this.scrollContainer.nativeElement.offsetTop;
    const walkX = (x - this.startX) * 1.5; // Scroll-fast
    const walkY = (y - this.startY) * 1.5; // Scroll-fast
    this.scrollContainer.nativeElement.scrollLeft = this.scrollLeft - walkX;
    this.scrollContainer.nativeElement.scrollTop = this.scrollTop - walkY;
  }

  onPanEnd() {
    this.isDragging = false;
  }

  async downloadZip() {
    const zip = new JSZip();
    const pages = this.pageService.pages();
    
    // Add pages to zip
    pages.forEach(page => {
      // Create a basic HTML structure for the page
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <style>
      /* Custom CSS */
    </style>
</head>
<body>
    ${page.htmlContent}
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
      
      zip.file(`${page.slug}.html`, htmlContent);
    });
    
    // Generate and save zip
    try {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'vvvebjs-lite-project.zip');
    } catch (error) {
      console.error('Error generating zip:', error);
      alert('Failed to generate ZIP file.');
    }
  }

  saveTemplate() {
    const currentId = this.pageService.currentPageId();
    if (currentId) {
      this.pageService.updatePage(currentId, this.builderService.htmlContent());
      alert('Page saved successfully!');
    } else {
      // Fallback if no page selected, though sidebar usually handles this
      const name = prompt('Save as new page. Enter name:', 'My New Page');
      if (name) {
        this.pageService.savePage(name, 'new-page', 'Description', this.builderService.htmlContent());
        const pages = this.pageService.pages();
        const newPage = pages[pages.length - 1];
        this.pageService.loadPage(newPage.id);
        alert('Page created and saved!');
      }
    }
  }

  openNewPageModal() {
    this.newPageData = { name: '', slug: '', description: '', template: 'blank' };
    this.showNewPageModal = true;
  }

  closeNewPageModal() {
    this.showNewPageModal = false;
  }

  async saveNewPage() {
    if (this.newPageData.name && this.newPageData.slug) {
      this.isCreatingPage = true;
      let initialContent = '<div class="container mx-auto p-4"><h1>' + this.newPageData.name + '</h1></div>';

      // Load template if selected
      const selectedTemplate = this.templates.find(t => t.id === this.newPageData.template);
      if (selectedTemplate && selectedTemplate.file) {
        try {
          const content = await firstValueFrom(this.http.get(selectedTemplate.file, { responseType: 'text' }));
          if (content) {
            initialContent = content;
          }
        } catch (error) {
          console.error('Failed to load template:', error);
          // Fallback to default content is already set
        }
      }

      this.pageService.savePage(
        this.newPageData.name, 
        this.newPageData.slug, 
        this.newPageData.description, 
        initialContent
      );
      
      // Load the newly created page (it's the last one)
      const pages = this.pageService.pages();
      const newPage = pages[pages.length - 1];
      this.loadPage(newPage.id);
      this.closeNewPageModal();
      this.isCreatingPage = false;
    }
  }

  loadPage(id: string) {
    const content = this.pageService.loadPage(id);
    if (content) {
      this.builderService.updateContent(content);
    }
  }

  openAttachModal(pageId: string) {
    this.pageAttachments = this.pageService.getAttachments(pageId);
    this.attachModalData = {
      pageId,
      activeTab: 'create',
      fileType: 'js',
      fileName: '',
      fileContent: '',
      selectedFile: null,
      selectedAttachmentId: null
    };
    this.showAttachModal = true;
  }

  closeAttachModal() {
    this.showAttachModal = false;
  }

  setAttachTab(tab: 'create' | 'upload') {
    this.attachModalData.activeTab = tab;
    this.attachModalData.selectedAttachmentId = null;
    this.attachModalData.fileName = '';
    this.attachModalData.fileContent = '';
    this.attachModalData.selectedFile = null;
  }

  selectAttachment(attachment: Attachment) {
    this.attachModalData.activeTab = 'edit';
    this.attachModalData.selectedAttachmentId = attachment.id;
    this.attachModalData.fileType = attachment.type;
    // Remove extension from filename for display if it's there
    const nameWithoutExt = attachment.name.replace(/\.(js|css)$/, '');
    this.attachModalData.fileName = nameWithoutExt;
    this.attachModalData.fileContent = attachment.content;
  }

  deleteAttachment(attachmentId: string) {
    if (confirm('Are you sure you want to delete this asset?')) {
      this.pageService.deleteAttachment(this.attachModalData.pageId, attachmentId);
      this.pageAttachments = this.pageService.getAttachments(this.attachModalData.pageId);
      if (this.attachModalData.selectedAttachmentId === attachmentId) {
        this.setAttachTab('create');
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.attachModalData.selectedFile = input.files[0];
    }
  }

  isValidAttachment(): boolean {
    if (this.attachModalData.activeTab === 'create') {
      return !!this.attachModalData.fileName && !!this.attachModalData.fileContent;
    } else if (this.attachModalData.activeTab === 'edit') {
      return !!this.attachModalData.fileContent;
    } else {
      return !!this.attachModalData.selectedFile;
    }
  }

  saveAttachment() {
    const { pageId, activeTab, fileType, fileName, fileContent, selectedFile, selectedAttachmentId } = this.attachModalData;
    
    if (activeTab === 'edit' && selectedAttachmentId) {
      this.pageService.updateAttachment(pageId, selectedAttachmentId, fileContent);
      this.pageAttachments = this.pageService.getAttachments(pageId);
      alert('Asset updated successfully!');
    } else {
      // Construct the payload
      const payload = {
        type: fileType,
        name: activeTab === 'create' ? `${fileName}.${fileType}` : selectedFile!.name,
        content: activeTab === 'create' ? fileContent : undefined,
        file: activeTab === 'upload' ? selectedFile! : undefined
      };

      this.pageService.attachFile(pageId, payload).then(() => {
        this.pageAttachments = this.pageService.getAttachments(pageId);
        alert('Asset attached successfully!');
        if (activeTab === 'create' || activeTab === 'upload') {
          this.setAttachTab('create');
        }
      });
    }
  }
}
