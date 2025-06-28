const upload = async (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }
        return response.json();
      })
      .then((data) => {
        resolve(data.url);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export default upload;

