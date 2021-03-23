import SparkMD5 from "spark-md5"
const baseUrl = 'http://localhost:3000';
export const SIZE = 0.2 * 1024 * 1024;

export function request({
  url,
  method = "post",
  data,
  onProgress = e=> e,
  headers={},
  requestList
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = onProgress;
    xhr.open(method, baseUrl+url);
    Object.keys(headers).forEach(key => xhr.setRequestHeader(key, headers[key]));
    xhr.send(data);
    xhr.onreadystatechange = e => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          if (requestList) {
            const i = requestList.findIndex(req => req===xhr);
            requestList.splice(i, 1);
          }
          resolve({
            data: e.target.response
          })
        } else if (xhr.status === 500) {
          reject('报错了')
        }
      }
      if (Array.isArray(requestList)) {
        requestList.push(xhr)
      }
    }
  })
}

export async function post(url,data){
  let ret = await request({
      url,
      data: JSON.stringify(data),
      headers: {
        "content-type": "application/json"
      }
  })
  return JSON.parse(ret.data)
}

export function createFileChunk(file, size = SIZE) {
  const chunks = [];
  let cur = 0;
  while(cur < file.size) {
    chunks.push({
      file: file.slice(cur, cur+size)
    })
    cur += size
  }

  return chunks;
}

export async function calculateHashSample(file) {
  return new Promise((resolve) => {
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    const size = file.size;
    let offset = 2 * 1024 * 1024;

    let chunks = [file.slice(0, offset)];

    let cur = offset;

    while(cur < size) {
      if (cur + offset >= size) {
        chunks.push(file.slice(cur, cur + offset));
      } else {
        const mid = cur + offset/2;
        const end = cur + offset;
        chunks.push(file.slice(cur, cur + 2));
        chunks.push(file.slice(mid, mid + 2));
        chunks.push(file.slice(end - 2, end));
      }
      cur += offset;
    }

    reader.readAsArrayBuffer(new Blob(chunks));

    reader.onload = e => {
      spark.append(e.target.result);
      resolve(spark.end())
    }

  })
}