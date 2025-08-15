import { controller, httpPost, httpGet, requestParam, httpDelete } from "inversify-express-utils";
import express from "express";
import { ContentBaseController } from "./ContentBaseController";
import { Section } from "../models";
import { Permissions } from "../helpers";
import { TreeHelper } from "../helpers/TreeHelper";

@controller("/sections")
export class SectionController extends ContentBaseController {
  @httpGet("/:id")
  public async get(
    @requestParam("id") id: string,
    req: express.Request<{}, {}, null>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      return await this.repositories.section.load(au.churchId, id);
    });
  }

  @httpPost("/duplicate/:id")
  public async duplicate(
    @requestParam("id") id: string,
    req: express.Request<{}, {}, null>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.content.edit)) return this.json({}, 401);
      else {
        const { convertToBlock } = req.query;
        let section = await this.repositories.section.load(au.churchId, id);
        const allElements: Element[] = await this.repositories.element.loadForSection(section.churchId, section.id);
        section = TreeHelper.buildTree([section], allElements)[0];
        let result;
        if (convertToBlock && convertToBlock !== "") {
          result = await TreeHelper.convertToBlock(section, convertToBlock.toString());
        } else {
          result = await TreeHelper.duplicateSection(section);
        }
        return result;
      }
    });
  }

  @httpPost("/")
  public async save(req: express.Request<{}, {}, Section[]>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.content.edit)) return this.json({}, 401);
      else {
        const promises: Promise<Section>[] = [];
        req.body.forEach((section) => {
          section.churchId = au.churchId;
          promises.push(this.repositories.section.save(section));
        });
        const result = await Promise.all(promises);
        if (req.body.length > 0) {
          if (req.body[0].blockId)
            await this.repositories.section.updateSortForBlock(req.body[0].churchId, req.body[0].blockId);
          else await this.repositories.section.updateSort(req.body[0].churchId, req.body[0].pageId, req.body[0].zone);
        }
        TreeHelper.populateAnswers(result);
        return result;
      }
    });
  }

  @httpDelete("/:id")
  public async delete(
    @requestParam("id") id: string,
    req: express.Request<{}, {}, null>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.content.edit)) return this.json({}, 401);
      else {
        const section = await this.repositories.section.load(au.churchId, id);
        await this.repositories.section.delete(au.churchId, id);
        if (section.blockId) {
          await this.repositories.section.updateSortForBlock(section.churchId, section.blockId);
          return this.json({});
        } else {
          await this.repositories.section.updateSort(section.churchId, section.pageId, section.zone);
          return this.json({});
        }
      }
    });
  }
}
