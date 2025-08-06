import api from "../request";

export const exportPDF = (htmlContent, options = {}, taskId = "unknown") => {
  api
    .download("/api/export/pdf", { htmlContent, options, taskId })
    .then((data) => console.log(data))
    .catch((error) => console.error(error));
};
export const exportWord = (htmlContent, options = {}, taskId = "unknown") => {
  api
    .download("/api/export/word", { htmlContent, options, taskId })
    .then((data) => console.log(data))
    .catch((error) => console.error(error));
};
