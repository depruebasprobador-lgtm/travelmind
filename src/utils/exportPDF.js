import generatePDF from 'react-to-pdf';

export const exportTripToPDF = (elementRef, tripName) => {
  const filename = `viaje-${tripName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  const options = {
    method: 'save',
    filename,
    page: { margin: 10, format: 'a4', orientation: 'portrait' },
    overrides: {
      pdf: {
        compress: true
      },
      canvas: {
        useCORS: true
      }
    }
  };

  if (elementRef && elementRef.current) {
    generatePDF(elementRef, options);
  } else {
    // Fallback
    window.print();
  }
};
