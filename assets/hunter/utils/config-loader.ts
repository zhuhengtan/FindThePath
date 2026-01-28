import { _decorator, resources, JsonAsset, TextAsset, assetManager, AssetManager } from "cc";
// import { parseCSV } from "../utils";
import Papa from "papaparse";
import { BUILD } from "cc/env";

interface Config {
  fileName: string;
  primaryKey?: string;
  secondaryKey?: string;
  tableName?: string;
  description?: string;
  className?: string;
}

interface LoadOptions {
  /** 分包名称，默认使用 resources */
  bundleName?: string;
  /** 配置文件路径前缀，默认为 "configs" */
  configPathPrefix?: string;
  /** all_config.csv 文件路径（不含扩展名），默认为 "configs/all_config" */
  allConfigPath?: string;
}

export class ConfigLoader {
  private _entityMap = null;
  private _bundle: AssetManager.Bundle | null = null;
  private _configPathPrefix: string = "configs";

  private _allTables: {
    fileName: string;
    primaryKey: string;
    secondaryKey?: string;
    tableName: string;
    className: string;
    description: string;
  }[] = [];
  private _allConfigs: { [key in string]: any } = {};
  private _allConfigsMap: Map<string, any> = new Map();
  private static _instance: ConfigLoader = null;

  // 单例模式获取实例
  public static get instance(): ConfigLoader {
    if (!this._instance) {
      this._instance = new ConfigLoader();
    }
    return this._instance;
  }

  /**
   * 加载所有配置
   * @param entityMap 实体类映射
   * @param callback 完成回调
   * @param options 加载选项
   */
  public loadAllConfigs(
    entityMap?: any,
    callback?: () => void,
    options?: LoadOptions
  ): void {
    this._entityMap = entityMap || {};

    const bundleName = options?.bundleName || "main-game";
    const allConfigPath = options?.allConfigPath || "configs/all_config";
    this._configPathPrefix = options?.configPathPrefix || "configs";

    console.log(`[ConfigLoader] Loading configs from bundle: ${bundleName}`);

    // 加载分包
    this.loadBundle(bundleName).then((bundle) => {
      this._bundle = bundle;
      this.loadConfig(allConfigPath, () => {
        if (callback) callback();
      });
    }).catch((err) => {
      console.error(`[ConfigLoader] Failed to load bundle: ${bundleName}`, err);
    });
  }

  private loadBundle(bundleName: string): Promise<AssetManager.Bundle> {
    return new Promise((resolve, reject) => {
      // 检查是否已加载
      const existingBundle = assetManager.getBundle(bundleName);
      if (existingBundle) {
        resolve(existingBundle);
        return;
      }

      assetManager.loadBundle(bundleName, (err, bundle) => {
        if (err || !bundle) {
          reject(err);
          return;
        }
        resolve(bundle);
      });
    });
  }

  public getAllConfigs() {
    return this._allConfigs;
  }
  public getAllConfigsMap() {
    return this._allConfigsMap;
  }
  public getConfigsByTableName(tableName: string) {
    return this._allConfigs[tableName];
  }
  public getConfigByTableNameAndKey(
    tableName: string,
    id: string | number,
    secondaryKeyValue?: string | number
  ) {
    const map = this._allConfigsMap.get(tableName);
    if (!map) return null;

    if (secondaryKeyValue !== undefined && secondaryKeyValue !== null) {
      // 使用复合键查询
      const compositeKey = `${id.toString()}_${secondaryKeyValue.toString()}`;
      return map.get(compositeKey);
    } else {
      // 兼容原有的只使用primaryKey的查询
      return map.get(id.toString());
    }
  }

  private loadConfig(allConfigPath: string, callback?: () => void): void {
    this.loadRes({
      fileName: allConfigPath,
    })
      .then((allConfig) => {
        this._allTables = allConfig.detail;
        console.log(`[ConfigLoader] Found ${this._allTables.length} config tables`);

        const promises = [];
        this._allTables.forEach((config) => {
          const { fileName, primaryKey, tableName, description } = config;
          promises.push(this.loadRes(config));
        });
        Promise.all(promises).then((res) => {
          // 先加载所有配置（原始数据，不转换为类实例）
          res.forEach(({ config, detail, detailMap }) => {
            const { fileName, primaryKey, tableName, description } = config;
            this._allConfigs[tableName] = detail;
            this._allConfigsMap.set(tableName, detailMap);
          });


          this.processAllReferences();

          this.convertAllToInstances();

          console.log("[ConfigLoader] 全部配置", this._allConfigs);
          console.log("[ConfigLoader] 全部配置Map", this._allConfigsMap);
          if (callback) callback();
        });
      })
      .catch((err) => {
        console.error("[ConfigLoader] Failed to load all_config:", err);
      });
  }

  /**
   * 将所有配置数据转换为类实例
   */
  private convertAllToInstances(): void {
    this._allTables.forEach(({ tableName, className }) => {
      // 如果有指定类名，转换为类实例
      if (className && this._entityMap[className]) {
        const ClassConstructor = this._entityMap[className];

        // 获取当前处理过引用字段后的数据
        const currentData = this._allConfigs[tableName];
        const currentMap = this._allConfigsMap.get(tableName);

        // 直接将原始数据替换为类实例
        if (currentData && Array.isArray(currentData)) {
          this._allConfigs[tableName] = currentData.map(
            (item) => {
              return new ClassConstructor(item)
            }
          );
        }

        // 直接将Map中的值替换为类实例
        if (currentMap) {
          currentMap.forEach((value, key) => {
            currentMap.set(key, new ClassConstructor(value));
          });
        }
      }
    });


  }

  private loadRes(config: Config): Promise<any> {
    const bundle = this._bundle;

    if (!bundle) {
      console.error("[ConfigLoader] Bundle not loaded");
      return Promise.reject(new Error("Bundle not loaded"));
    }

    if (BUILD) {
      return new Promise((resolve, reject) => {
        const jsonPath = config.fileName.replace(/^configs\//, "configs_json/");
        console.log(`[ConfigLoader] Loading JSON: ${jsonPath}`);
        bundle.load(jsonPath, JsonAsset, (err, asset) => {
          if (err) {
            console.error(`[ConfigLoader] Failed to load: ${jsonPath}`, err);
            reject(err);
          } else {
            if (config.primaryKey) {
              resolve({
                config,
                detail: asset.json,
                detailMap: this.transferToMap(
                  config.primaryKey,
                  asset.json as any[],
                  config.secondaryKey
                ),
              });
            } else {
              resolve({
                config,
                detail: asset.json,
                detailMap: null,
              });
            }
          }
        });
      });
    }

    return new Promise((resolve, reject) => {
      console.log(`[ConfigLoader] Loading CSV: ${config.fileName}`);
      bundle.load(config.fileName, TextAsset, (err, asset) => {
        if (err) {
          console.error(`[ConfigLoader] Failed to load: ${config.fileName}`, err);
          reject(err);
        } else {
          const res = Papa.parse(asset.text, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";",
          }).data;

          // 添加类型转换处理
          const processedData = this.convertFieldTypes(res);

          if (config.primaryKey) {
            resolve({
              config,
              detail: processedData,
              detailMap: this.transferToMap(
                config.primaryKey,
                processedData,
                config.secondaryKey
              ),
            });
          } else {
            resolve({
              config,
              detail: processedData,
              detailMap: null,
            });
          }
        }
      });
    });
  }

  private convertFieldTypes(data: any[]): any[] {
    if (!data || !data.length) return data;

    return data.map((item) => {
      const processedItem = { ...item };

      // 遍历每个字段
      for (const key in processedItem) {
        const value = processedItem[key];

        // 跳过空值
        if (value === undefined || value === null || value === "") continue;

        // 尝试转换字段值类型
        try {
          // 尝试用JSON.parse转换
          processedItem[key] = JSON.parse(value);
        } catch (e) {
          // 如果解析失败，保留原始值
          // 这里可能是普通字符串，不需要转换
        }
      }

      return processedItem;
    });
  }

  private transferToMap(
    primaryKey: string,
    detail: any[],
    secondaryKey?: string
  ) {
    const map = new Map();
    detail.forEach((item) => {
      if (
        secondaryKey &&
        item[secondaryKey] !== undefined &&
        item[secondaryKey] !== null &&
        item[secondaryKey] !== ""
      ) {
        // 使用primaryKey和secondaryKey的组合作为键
        const compositeKey = `${item[primaryKey]}_${item[secondaryKey]}`;
        map.set(compositeKey, item);
      } else {
        // 如果没有secondaryKey或secondaryKey值为空，则只使用primaryKey
        map.set(item[primaryKey].toString(), item);
      }
    });
    return map;
  }

  /**
   * 解析可能是数组格式的字符串
   */
  private parseArrayValue(value: string): any[] | any {
    if (!value) return [];

    // 如果不是字符串，直接返回
    if (typeof value !== "string") {
      return Array.isArray(value) ? value : value;
    }

    // 去除首尾空格
    const trimmed = value.trim();

    // 如果已经是数组类型（可能是convertFieldTypes已经转换过的）
    if (Array.isArray(trimmed)) {
      return trimmed;
    }

    // 如果是对象类型（可能是convertFieldTypes已经转换过的）
    if (typeof trimmed === "object" && trimmed !== null) {
      return trimmed;
    }

    // 如果是单个值，返回单值数组
    return trimmed;
  }

  /**
   * 处理所有配置中的引用字段
   * 引用字段格式为：字段名@表名 或 字段名@表名:secondaryKey
   * 只处理一层引用，避免循环引用问题
   */
  private processAllReferences(): void {
    // 遍历所有配置表
    for (const tableName in this._allConfigs) {
      const tableData = this._allConfigs[tableName];
      const tableMap = this._allConfigsMap.get(tableName);

      if (!tableData || !tableData.length) continue;

      // 检查第一条数据，获取所有可能的引用字段
      const firstItem = tableData[0];
      const referenceFields: {
        fieldName: string;
        refTable: string;
        secondaryKey?: string;
        originKey: string;
      }[] = [];

      // 查找所有带@的字段
      for (const key in firstItem) {
        if (key.includes("@")) {
          const [fieldName, refTableInfo] = key.split("@");
          // 处理可能包含secondaryKey的情况
          let refTable = refTableInfo;
          let secondaryKey = undefined;

          if (refTableInfo.includes(":")) {
            const [table, secKey] = refTableInfo.split(":");
            refTable = table;
            secondaryKey = secKey;
          }

          referenceFields.push({
            fieldName: fieldName,
            originKey: key,
            refTable,
            secondaryKey,
          });
        }
      }

      // 如果没有引用字段，跳过此表
      if (referenceFields.length === 0) continue;

      // 处理每一条数据的引用字段
      tableData.forEach((item) => {
        referenceFields.forEach(
          ({ fieldName, refTable, secondaryKey, originKey }) => {
            // 获取引用值（可能是单个ID或ID数组）
            const refValue = item[originKey];
            if (refValue === undefined || refValue === null || refValue === "")
              return;

            try {
              // 解析可能的数组值
              const ids = this.parseArrayValue(refValue);
              if (Array.isArray(ids)) {
                // 处理数组情况，支持 [id, count] 元组
                const refItems = [] as any[];
                for (const raw of ids) {
                  let id: any = raw;
                  let count = 1;
                  if (Array.isArray(raw) && raw.length >= 1) {
                    id = raw[0];
                    if (raw.length >= 2) {
                      const c = Number(raw[1]);
                      count = Number.isFinite(c) && c > 0 ? Math.floor(c) : 1;
                    }
                  }
                  const refItem = this.getConfigByTableNameAndKey(
                    refTable,
                    id,
                    secondaryKey
                  );
                  if (!refItem) continue;
                  for (let i = 0; i < count; i++) refItems.push(refItem);
                }
                item[fieldName] = refItems;
              } else if (typeof ids === "object" && ids !== null) {
                // 处理对象情况，创建一个新对象来存储引用项
                const refObject = {};

                // 遍历对象的所有键
                for (const key in ids) {
                  if (ids.hasOwnProperty(key)) {
                    let id: any = ids[key];
                    let count = 1;
                    if (Array.isArray(id) && id.length >= 1) {
                      const rawId = id[0];
                      const c = Number(id[1]);
                      id = rawId;
                      count = Number.isFinite(c) && c > 0 ? Math.floor(c) : 1;
                    }
                    const refItem = this.getConfigByTableNameAndKey(
                      refTable,
                      id,
                      secondaryKey
                    );
                    refObject[key] = refItem ? (count > 1 ? { item: refItem, count } : refItem) : null;
                  }
                }

                item[fieldName] = refObject;
              } else {
                // 处理单个ID情况
                // 直接使用secondaryKey作为getConfigByTableNameAndKey的第三个参数
                const refItem = this.getConfigByTableNameAndKey(
                  refTable,
                  ids,
                  secondaryKey
                );

                item[fieldName] = refItem || null;
              }

              // 可选：删除原始字段
              delete item[originKey];
            } catch (e) { }
          }
        );
      });
    }


  }
  /**
   * 根据ID获取指定类的单个实例
   * @param tableName 表名
   * @param id ID
   * @param ClassConstructor 类构造函数
   * @returns 类实例
   */
  public getInstanceById<T>(
    tableName: string,
    id: string | number,
    ClassConstructor: new (data: any) => T
  ): T | null {
    const configItem = this.getConfigByTableNameAndKey(tableName, id);
    if (!configItem) {
      return null;
    }

    return new ClassConstructor(configItem);
  }
}
