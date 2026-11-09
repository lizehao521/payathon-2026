import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名(clsx + tailwind-merge)
 * @param  {...any} inputs
 * @returns {string}
 */
export function cn() {
  var args = arguments;
  var list = [];
  for (var i = 0; i < args.length; i++) {
    list.push(args[i]);
  }
  return twMerge(clsx(list));
}
