import { createUrl, deleteUrl, getUrlForUser, listUrls, updateUrl } from "../services/urlService.js";

export async function create(request, response) {
  const url = await createUrl(request.user._id, request.validatedBody);
  response.status(201).json({ url });
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
