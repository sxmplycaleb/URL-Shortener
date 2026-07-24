import { createUrl, deleteUrl, getUrlForUser, listUrls, updateUrl } from "../services/urlService.js";
import { exportUrls, sendExport } from "../services/exportService.js";

export async function create(request, response) {
  const result = await createUrl(request.user._id, request.validatedBody);
  response.status(201).json(result);
}

export async function list(request, response) {
  const urls = await listUrls(request.user._id);
  response.json({ urls });
}

export async function getById(request, response) {
  const url = await getUrlForUser(request.user._id, request.params.id);
  response.json({ url });
}

export async function update(request, response) {
  const url = await updateUrl(request.user._id, request.params.id, request.validatedBody);
  response.json({ url });
}

export async function remove(request, response) {
  await deleteUrl(request.user._id, request.params.id);
  response.status(204).send();
}

export async function exportList(request, response) {
  sendExport(response, await exportUrls(request.user._id, request.query.format));
}
