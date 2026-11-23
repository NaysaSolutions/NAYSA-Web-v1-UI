import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFile, faFileExcel, faFileWord, faFilePowerpoint, faFilePdf,
  faFileImage, faFileLines, faFileCode, faFileZipper,
} from "@fortawesome/free-solid-svg-icons";

export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export default function AttachmentFileIcon({ fileName = "" }) {
  const extension = String(fileName).split(".").pop().toLowerCase();
  const types = [
    [["xls", "xlsx", "xlsm", "csv"], faFileExcel, "text-emerald-600", "Excel / Spreadsheet"],
    [["doc", "docx", "docm", "rtf"], faFileWord, "text-blue-600", "Word document"],
    [["ppt", "pptx", "pptm"], faFilePowerpoint, "text-orange-600", "PowerPoint presentation"],
    [["pdf"], faFilePdf, "text-red-600", "PDF document"],
    [["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"], faFileImage, "text-violet-500", "Image"],
    [["txt", "log"], faFileLines, "text-slate-500", "Text document"],
    [["json", "xml"], faFileCode, "text-cyan-600", "Data file"],
    [["zip", "rar", "7z"], faFileZipper, "text-amber-600", "Archive"],
  ];
  const [, icon, color, label] = types.find(([extensions]) => extensions.includes(extension))
    || [[], faFile, "text-slate-400", "File"];
  return <FontAwesomeIcon icon={icon} className={`w-4 shrink-0 text-base ${color}`} title={label} aria-label={label} />;
}
