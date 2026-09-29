import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Filesystem-safe name, with the extension the recipient should see. */
export const toFileName = (label, extension = 'pdf') => {
  const slug = String(label || 'document')
    .trim()
    .replace(/[^\w\d-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${slug || 'document'}.${extension}`;
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

/**
 * Writes text to a file and hands it to the OS share sheet.
 *
 * How a statement reaches WhatsApp: the link form of WhatsApp carries text
 * only, so a file has to go through the share sheet, where WhatsApp is one
 * target among many. Same path serves email and Drive.
 *
 * The BOM is there so Excel opens the file as UTF-8. Without it, a customer
 * named in Devanagari — or any rupee sign — arrives as mojibake, and the
 * shopkeeper has no way to tell the export is fine and Excel is not.
 */
export const shareTextFile = async (
  content,
  label,
  { extension = 'csv', mimeType = 'text/csv', bom = true } = {},
) => {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  const destination = new File(Paths.cache, toFileName(label, extension));
  if (destination.exists) destination.delete();
  destination.create();
  destination.write(`${bom ? '\ufeff' : ''}${content}`);

  await Sharing.shareAsync(destination.uri, {
    mimeType,
    dialogTitle: label,
    UTI: extension === 'csv' ? 'public.comma-separated-values-text' : 'public.plain-text',
  });

  return destination.uri;
};
