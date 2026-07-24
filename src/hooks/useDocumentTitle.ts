import { useEffect } from "react";

import { getPageTitle } from "@/lib/brand";

export function useDocumentTitle(page: string) {
  useEffect(() => {
    document.title = getPageTitle(page);
  }, [page]);
}
