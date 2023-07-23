import { sha512 } from "js-sha512";

export const hasher = (args: string) => {
  const hash = sha512(args)
  return hash
}
