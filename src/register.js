import {registerAttachments} from "./tools/attachment/attachments.js";
import {registerUploadAttachment} from "./tools/attachment/upload-attachment.js";
import {registerAddComment} from "./tools/comment/add-comment.js";
import {registerGetComments} from "./tools/comment/get-comments.js";
import {registerCreatePage} from "./tools/page/create-page.js";
import {registerDeletePage} from "./tools/page/delete-page.js";
import {registerGetPage} from "./tools/page/get-page.js";
import {registerGetPageByTitle} from "./tools/page/get-page-by-title.js";
import {registerMovePage} from "./tools/page/move-page.js";
import {registerPatchPage} from "./tools/page/patch-page.js";
import {registerSearchPages} from "./tools/page/search-pages.js";
import {registerUpdatePage} from "./tools/page/update-page.js";
import {registerListSpaces} from "./tools/space/list-spaces.js";
import {registerGetUser} from "./tools/user/get-user.js";

/** @param {any} server An McpServer, or anything with its registerTool. */
export const registerTools = (server) => {
  registerGetPage(server);
  registerCreatePage(server);
  registerUpdatePage(server);
  registerPatchPage(server);
  registerDeletePage(server);
  registerMovePage(server);
  registerGetPageByTitle(server);
  registerSearchPages(server);
  registerListSpaces(server);
  registerGetUser(server);
  registerAddComment(server);
  registerGetComments(server);
  registerUploadAttachment(server);
  registerAttachments(server);
};
