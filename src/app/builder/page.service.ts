import { Injectable, signal } from '@angular/core';

export interface Attachment {
  id: string;
  name: string;
  type: 'js' | 'css';
  content: string;
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  description: string;
  htmlContent: string;
  createdAt: Date;
  attachments?: Attachment[];
}

@Injectable({
  providedIn: 'root'
})
export class PageService {
  pages = signal<Page[]>([]);
  currentPageId = signal<string | null>(null);

  constructor() {
    this.loadFromStorage();
    if (this.pages().length === 0) {
      // Seed with default data if empty
      this.pages.set([
        { 
          id: '1', 
          name: 'Home Page', 
          slug: 'index',
          description: 'The main landing page',
          htmlContent: '<div class="container mx-auto p-4"><h1>Home Page</h1><p>Welcome!</p></div>', 
          createdAt: new Date(),
          attachments: []
        },
        { 
          id: '2', 
          name: 'About Us', 
          slug: 'about',
          description: 'Company information',
          htmlContent: '<div class="container mx-auto p-4"><h1>About Us</h1><p>We are a great team.</p></div>', 
          createdAt: new Date(),
          attachments: []
        }
      ]);
      this.saveToStorage();
    }
  }

  private loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('vvvebjs-lite-pages');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          this.pages.set(parsed.map((p: Page) => ({ ...p, createdAt: new Date(p.createdAt) })));
        } catch (e) {
          console.error('Failed to load pages from storage', e);
        }
      }
    }
  }

  private saveToStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('vvvebjs-lite-pages', JSON.stringify(this.pages()));
    }
  }

  getPages() {
    return this.pages();
  }

  savePage(name: string, slug: string, description: string, htmlContent: string) {
    const newPage: Page = {
      id: Date.now().toString(),
      name,
      slug,
      description,
      htmlContent,
      createdAt: new Date()
    };
    this.pages.update(pages => [...pages, newPage]);
    this.saveToStorage();
  }

  updatePage(id: string, htmlContent: string) {
    this.pages.update(pages => pages.map(p => p.id === id ? { ...p, htmlContent } : p));
    this.saveToStorage();
  }

  loadPage(id: string): string | undefined {
    const page = this.pages().find(p => p.id === id);
    if (page) {
      this.currentPageId.set(id);
      return page.htmlContent;
    }
    return undefined;
  }
  
  deletePage(id: string) {
    this.pages.update(pages => pages.filter(p => p.id !== id));
    if (this.currentPageId() === id) {
      this.currentPageId.set(null);
    }
    this.saveToStorage();
  }

  getAttachments(pageId: string): Attachment[] {
    const page = this.pages().find(p => p.id === pageId);
    return page?.attachments || [];
  }

  attachFile(pageId: string, fileData: { type: 'js' | 'css', name: string, content?: string, file?: File }) {
    return new Promise<void>((resolve, reject) => {
      const page = this.pages().find(p => p.id === pageId);
      if (!page) {
        reject('Page not found');
        return;
      }

      const newAttachment: Attachment = {
        id: Date.now().toString(),
        name: fileData.name,
        type: fileData.type,
        content: fileData.content || ''
      };

      if (fileData.file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newAttachment.content = e.target?.result as string;
          this.saveAttachmentToPage(pageId, newAttachment);
          resolve();
        };
        reader.onerror = () => reject('Failed to read file');
        reader.readAsText(fileData.file);
      } else {
        this.saveAttachmentToPage(pageId, newAttachment);
        resolve();
      }
    });
  }

  private saveAttachmentToPage(pageId: string, attachment: Attachment) {
    this.pages.update(pages => pages.map(p => {
      if (p.id === pageId) {
        const attachments = p.attachments || [];
        return { ...p, attachments: [...attachments, attachment] };
      }
      return p;
    }));
    this.saveToStorage();
  }

  updateAttachment(pageId: string, attachmentId: string, content: string) {
    this.pages.update(pages => pages.map(p => {
      if (p.id === pageId && p.attachments) {
        return {
          ...p,
          attachments: p.attachments.map(a => a.id === attachmentId ? { ...a, content } : a)
        };
      }
      return p;
    }));
    this.saveToStorage();
  }

  deleteAttachment(pageId: string, attachmentId: string) {
    this.pages.update(pages => pages.map(p => {
      if (p.id === pageId && p.attachments) {
        return {
          ...p,
          attachments: p.attachments.filter(a => a.id !== attachmentId)
        };
      }
      return p;
    }));
    this.saveToStorage();
  }
}
