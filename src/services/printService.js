import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Filesystem-safe name for the generated PDF. */
export const toFileName = (label) => {
  const slug = String(label || 'document')
    .trim()
    .replace(/[^\w\d-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${slug || 'document'}.pdf`;
};

/** Opens the OS print / AirPrint sheet. */
export const printHtml = async (html) => {
  await Print.printAsync({ html });
};

/**
 * Renders HTML to a PDF and hands it to the OS share sheet.
 *
 * expo-print writes to a hashed temp filename, so the file is copied to a
 * readable name first — that is the name the recipient sees. A failure to
 * rename is non-fatal; the original file is still shareable.
 */
export const sharePdf = async (html, label) => {
  const { uri } = await Print.printToFileAsync({ html });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  let shareUri = uri;
  try {
    const destination = new File(Paths.cache, toFileName(label));
    if (destination.exists) destination.delete();
    new File(uri).copy(destination);
    shareUri = destination.uri;
  } catch {
    // Keep the hashed name rather than failing the whole share.
  }

  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    dialogTitle: label,
    UTI: 'com.adobe.pdf',
  });

  return shareUri;
};

export const isPrintingSupported = Platform.OS !== 'web';
