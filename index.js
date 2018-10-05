"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function isPrimitiveOrPrimitiveClass(obj) {
    switch (typeof obj) {
        case 'string':
        case 'boolean':
        case 'number':
            return true;
    }
    if (obj === String || obj === Boolean || obj === Number) {
        return true;
    }
    return (obj instanceof String) || (obj instanceof Number) || (obj instanceof Boolean);
}
function isArrayOrArrayClass(clazz) {
    if (clazz === Array) {
        return true;
    }
    return Array.isArray(clazz);
}
/**
 * Decorator variable name
 *
 * @const
 */
var JSON_META_DATA_KEY = 'JsonProperty';
/**
 * DecoratorMetaData
 * Model used for decoration parameters
 *
 * @class
 * @property {string} name, indicate which json property needed to map
 * @property {string} clazz, if the target is not primitive type, map it to corresponding class
 */
var DecoratorMetaData = /** @class */ (function () {
    function DecoratorMetaData(name, clazz) {
        this.name = name;
        this.clazz = clazz;
    }
    return DecoratorMetaData;
}());
/**
 * JsonProperty
 *
 * @function
 * @property {IDecoratorMetaData<T>|string} metadata, encapsulate it to DecoratorMetaData for standard use
 * @return {(target:Object, targetKey:string | symbol)=> void} decorator function
 */
function JsonProperty(metadata) {
    var decoratorMetaData;
    switch (typeof metadata) {
        case 'string':
            decoratorMetaData = new DecoratorMetaData(metadata);
            break;
        case 'object':
            decoratorMetaData = metadata;
            break;
        default:
            throw new Error('index.ts: meta data in Json property is undefined. meta data: ' + metadata);
    }
    return Reflect.metadata(JSON_META_DATA_KEY, decoratorMetaData);
}
exports.JsonProperty = JsonProperty;
/**
 * getClazz
 *
 * @function
 * @property {any} target object
 * @property {string} propertyKey, used as target property
 * @return {Function} Function/Class indicate the target property type
 * @description Used for type checking, if it is not primitive type, loop inside recursively
 */
function getClazz(target, propertyKey) {
    return Reflect.getMetadata('design:type', target, propertyKey);
}
/**
 * getJsonProperty
 *
 * @function
 * @property {any} target object
 * @property {string} propertyKey, used as target property
 * @return {IDecoratorMetaData<T>} Obtain target property decorator meta data
 */
function getJsonProperty(target, propertyKey) {
    return Reflect.getMetadata(JSON_META_DATA_KEY, target, propertyKey);
}
/**
 * hasAnyNullOrUndefined
 *
 * @function
 * @property {...args:any[]} any arguments
 * @return {IDecoratorMetaData<T>} check if any arguments is null or undefined
 */
function hasAnyNullOrUndefined() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return args.some(function (arg) { return arg === null || arg === undefined; });
}
function mapFromJson(decoratorMetadata, instance, json, key) {
    /**
     * if decorator name is not found, use target property key as decorator name. It means mapping it directly
     */
    var decoratorName = decoratorMetadata.name || key;
    var innerJson = json ? json[decoratorName] : undefined;
    var clazz = getClazz(instance, key);
    if (isArrayOrArrayClass(clazz)) {
        var metadata_1 = getJsonProperty(instance, key);
        if (metadata_1 && metadata_1.clazz || isPrimitiveOrPrimitiveClass(clazz)) {
            if (innerJson && isArrayOrArrayClass(innerJson)) {
                return innerJson.map(function (item) { return deserialize(metadata_1.clazz || clazz, item); });
            }
            return;
        }
        else {
            return innerJson;
        }
    }
    if (!isPrimitiveOrPrimitiveClass(clazz)) {
        return deserialize(clazz, innerJson);
    }
    return json ? json[decoratorName] : undefined;
}
/**
 * deserializeInto
 *
 * @function
 * @param instance whose members will be updated using the mapping json
 * @param json input to be mapped
 * @param debugMetadata {true} logs decoratorMetaData, json, key, originalValue, and newValue to the debug console
 */
function deserializeInto(instance, json, debugMetadata) {
    if (debugMetadata === void 0) { debugMetadata = false; }
    if (hasAnyNullOrUndefined(instance, json)) {
        return;
    }
    Object.keys(instance).forEach(function (key) {
        /**
         * get decoratorMetaData, structure: { name?:string, clazz?:{ new():T } }
         */
        var decoratorMetaData = getJsonProperty(instance, key);
        /**
         * pass value to instance
         */
        var newValue;
        if (decoratorMetaData && decoratorMetaData.customConverter) {
            newValue = decoratorMetaData.customConverter.fromJson(json[decoratorMetaData.name || key]);
        }
        else {
            newValue = decoratorMetaData ? mapFromJson(decoratorMetaData, instance, json, key) : json[key];
        }
        if (debugMetadata) {
            var originalValue = instance[key];
            console.debug({ decoratorMetaData: decoratorMetaData, json: json, key: key, originalValue: originalValue, newValue: newValue });
        }
        instance[key] = newValue;
    });
}
exports.deserializeInto = deserializeInto;
/**
 * deserialize
 *
 * @function
 * @param {{new():T}} Clazz, class type which is going to initialize and hold a mapping json
 * @param {Object} json, input json object which to be mapped
 * @param debugMetadata {true} logs decoratorMetaData, json, key, originalValue, and newValue to the debug console
 *
 * @return {T} return mapped object
 */
function deserialize(Clazz, json, debugMetadata) {
    if (debugMetadata === void 0) { debugMetadata = false; }
    /**
     * As it is a recursive function, ignore any arguments that are unset
     */
    if (hasAnyNullOrUndefined(Clazz, json)) {
        return;
    }
    /**
     * Prevent non-json continue
     */
    if (typeof json !== 'object') {
        return;
    }
    /**
     * init root class to contain json
     */
    var instance = new Clazz();
    deserializeInto(instance, json, debugMetadata);
    return instance;
}
exports.deserialize = deserialize;
/**
 * Serialize: Creates a ready-for-json-serialization object from the provided model instance.
 * Only @JsonProperty decorated properties in the model instance are processed.
 *
 * @param instance an instance of a model class
 * @returns {any} an object ready to be serialized to JSON
 */
function serialize(instance) {
    if (!(typeof instance !== 'object') || isArrayOrArrayClass(instance)) {
        return instance;
    }
    var obj = {};
    Object.keys(instance).forEach(function (key) {
        var metadata = getJsonProperty(instance, key);
        obj[metadata && metadata.name ? metadata.name : key] = serializeProperty(metadata, instance[key]);
    });
    return obj;
}
exports.serialize = serialize;
/**
 * Prepare a single property to be serialized to JSON.
 *
 * @param metadata
 * @param prop
 * @returns {any}
 */
function serializeProperty(metadata, prop) {
    if (!metadata || metadata.excludeToJson === true) {
        return;
    }
    if (metadata.customConverter) {
        return metadata.customConverter.toJson(prop);
    }
    if (!metadata.clazz) {
        return prop;
    }
    if (isArrayOrArrayClass(prop)) {
        return prop.map(function (propItem) { return serialize(propItem); });
    }
    return serialize(prop);
}
//# sourceMappingURL=index.js.map