import extractPage from "../helper/extractPages.helper.js";

export async function extractor(path, page, baseUrl) {
  try {
    const [data, totalPages] = await extractPage(page, path, baseUrl);
    return { data, totalPages };
  } catch (error) {
    console.error(
      `Error extracting data for ${path} from page ${page}:`,
      error.message
    );
    throw error;
  }
}
