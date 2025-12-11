// import { useI18n } from "vue-i18n";
import { isEmpty, isEmptyArray, isNullOrUndefined } from "./helpers";

export function useValidators() {
  // const { t } = useI18n();
  const t = (key) => key; // Placeholder translation function
  // 👉 Required Validator
  const requiredValidator = (value) => {
    if (isNullOrUndefined(value) || isEmptyArray(value) || value === false)
      return t("Required");

    return !!String(value).trim().length || t("Required");
  };


  // 👉 Phone Validator
  const phoneValidator = (phone) => {
    if (isEmpty(phone)) return true;
    const regExp = /^(((5|6|7)[0-9]{8}))$/;
    const validPhone = regExp.test(phone);

    return validPhone || t("Invalid phone");
  };


  const passwordValidator = (password) => {
    if (!password) return t("Required");

    const validPassword = password.length > 7;

    return validPassword || t("Invalid password");
  };


  // 👉 Confirm Password Validator
  const confirmPasswordValidator = (value, target) =>
    value === target || t("Password mismatch");

  // 👉 Image Type Validator
  const imageTypeValidator = (value) => {
    if (isEmpty(value)) return true;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

    if (Array.isArray(value)) {
      return (
        value.every((file) => allowedTypes.includes(file.type)) ||
        t("Invalid image format")
      );
    }

    return allowedTypes.includes(value.type) || t("Invalid image format");
  };


  return {
    requiredValidator,
    passwordValidator,
    confirmPasswordValidator,
    imageTypeValidator,
    phoneValidator
  };
}
