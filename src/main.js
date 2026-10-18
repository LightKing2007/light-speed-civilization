/* 入口：按顺序载入全部章节并启动影片。 */
import { boot } from './engine/film.js';
import CHAPTERS from './chapters/index.js';
boot(CHAPTERS);
