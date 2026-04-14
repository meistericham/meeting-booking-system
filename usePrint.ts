import React, { useCallback } from 'react'; // <--- Kita tambah import React di sini

export const usePrint = (options: { content: () => React.ReactNode | null; documentTitle?: string }) => {
  return useCallback(() => {
    const contentNode = options.content();
    
    // Pastikan content wujud dan ia adalah HTML Element
    if (contentNode) {
      // Kita anggap contentNode tu HTML element untuk dapatkan innerHTML
      // (Dalam React ref, current biasanya adalah HTMLDivElement)
      const printContents = (contentNode as unknown as HTMLElement).innerHTML;
      
      // 2. Buat iframe tersembunyi
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        // 3. Masukkan content & style Tailwind ke dalam iframe
        doc.open();
        doc.write(`
          <html>
            <head>
              <title>${options.documentTitle || 'Document'}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                body { margin: 20px; font-family: sans-serif; }
                @media print { 
                  @page { margin: 10mm; } 
                  body { 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact; /* Fix untuk warning CSS tadi */
                  }
                }
              </style>
            </head>
            <body>
              ${printContents}
            </body>
          </html>
        `);
        doc.close();

        // 4. Print bila dah load
        iframe.onload = () => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          // Remove iframe lepas print
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        };
      }
    }
  }, [options]);
};