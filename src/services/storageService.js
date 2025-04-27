/**
 * Convert a file to Base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - A promise that resolves with the Base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Converting file to Base64:', file.name);

      const reader = new FileReader();

      reader.onload = () => {
        const base64String = reader.result;
        console.log('File converted to Base64 successfully');
        resolve(base64String);
      };

      reader.onerror = (error) => {
        console.error('Error converting file to Base64:', error);
        reject(error);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error in fileToBase64:', error);
      reject(error);
    }
  });
};

/**
 * Process a logo for a business or delivery company
 * @param {File} file - The logo file to process
 * @param {string} type - Either 'business' or 'deliveryCompany'
 * @param {string} id - The ID of the business or delivery company
 * @returns {Promise<string>} - A promise that resolves with the Base64 string
 */
export const uploadLogo = async (file, type, id) => {
  try {
    console.log('uploadLogo called with:', { type, id, fileName: file.name });

    // Convert the file to Base64
    const base64String = await fileToBase64(file);
    console.log('Logo converted to Base64 successfully');

    return base64String;
  } catch (error) {
    console.error('Error in uploadLogo function:', error);
    throw error;
  }
};
