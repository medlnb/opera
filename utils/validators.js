// import { useI18n } from "vue-i18n";
import { isEmpty, isEmptyArray, isNullOrUndefined } from "./helpers";

export function useValidators() {
  // const { t } = useI18n();
  const t = (key) => key; // Placeholder translation function
  // 👉 Required Validator
  const requiredValidator = (value) => {
    if (isNullOrUndefined(value) || isEmptyArray(value) || value === false)
      return t("required");

    return !!String(value).trim().length || t("required");
  };


  // 👉 Phone Validator
  const phoneValidator = (phone) => {
    if (isEmpty(phone)) return true;
    const regExp = /^(((5|6|7)[0-9]{8}))$/;
    const validPhone = regExp.test(phone);

    return validPhone || t("invalid_phone");
  };


  const passwordValidator = (password) => {
    if (!password) return t("required_field");

    const validPassword = password.length > 7;

    return validPassword || t("invalid_password");
  };


  // 👉 Confirm Password Validator
  const confirmPasswordValidator = (value, target) =>
    value === target || t("password_mismatch");

  // 👉 Image Type Validator
  const imageTypeValidator = (value) => {
    if (isEmpty(value)) return true;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

    if (Array.isArray(value)) {
      return (
        value.every((file) => allowedTypes.includes(file.type)) ||
        t("invalid_image_format")
      );
    }

    return allowedTypes.includes(value.type) || t("invalid_image_format");
  };


  return {
    requiredValidator,
    passwordValidator,
    confirmPasswordValidator,
    imageTypeValidator,
    phoneValidator
  };
}
