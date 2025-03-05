declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: {
      type?: string;
      quality?: number;
    };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      letterRendering?: boolean;
      width?: number;
      height?: number;
      allowTaint?: boolean;
      scrollY?: number;
      scrollX?: number;
      dpi?: number;
      imageTimeout?: number;
      [key: string]: any;
    };
    jsPDF?: {
      unit?: string;
      format?: string | [number, number];
      orientation?: 'portrait' | 'landscape';
      compress?: boolean;
      hotfixes?: string[];
      [key: string]: any;
    };
    pagebreak?: {
      mode?: string | string[];
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface Html2PdfWorker {
    from(element: HTMLElement | string): Html2PdfWorker;
    set(options: Html2PdfOptions): Html2PdfWorker;
    save(): Promise<void>;
    outputPdf(type: 'blob'): Promise<Blob>;
    outputPdf(type: 'datauristring'): Promise<string>;
    outputPdf(type: string): Promise<any>;
    output(type: string, options?: any): Promise<any>;
    then(callback: Function): Html2PdfWorker;
    catch(callback: Function): Html2PdfWorker;
  }

  function html2pdf(): Html2PdfWorker;
  function html2pdf(element: HTMLElement | string, options?: Html2PdfOptions): Html2PdfWorker;

  export = html2pdf;
} 