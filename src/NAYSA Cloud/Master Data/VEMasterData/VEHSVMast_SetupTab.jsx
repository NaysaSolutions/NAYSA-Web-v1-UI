// src/NAYSA Cloud/Master Data/VEMasterData/VEHSVMast_SetupTab.jsx

import React, {
  useMemo,
  useRef,
  useState,
} from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faCarSide,
} from "@fortawesome/free-solid-svg-icons";

import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import genericVehicleImage from "@/NAYSA Cloud/Master Data/VEMasterData/naysa-generic-vehicle.png";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchCustMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import SearchVEMakeRef from "@/NAYSA Cloud/Lookup/SearchVEMakeRef.jsx";
import SearchVEModelRef from "@/NAYSA Cloud/Lookup/SearchVEModelRef.jsx";
import SearchVETypeRef from "@/NAYSA Cloud/Lookup/SearchVETypeRef.jsx";
import SearchVEClassRef from "@/NAYSA Cloud/Lookup/SearchVEClassRef.jsx";

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED UI
   ───────────────────────────────────────────────────────────────────────────── */

const SectionHeader = ({ title, icon }) => (
  <div className="mb-3 mt-1">
    <div className="text-[9px] sm:text-[12px] font-bold text-slate-500 dark:text-slate-400 tracking-widest border-b dark:border-slate-700 pb-2 mb-3 uppercase">
      {icon && <span className="opacity-70">{icon}</span>}
      {title}
    </div>
  </div>
);

const Card = ({ children, className = "" }) => (
  <div
    className={[
      "global-tran-textbox-group-div-ui flex flex-col",
      "transition-all duration-150",
      "focus-within:ring-2 focus-within:ring-blue-400/60 focus-within:shadow-2xl",
      "focus-within:-translate-y-[1px]",
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────────────────────── */

const getValue = (input) => {
  if (input && typeof input === "object") {
    if ("target" in input) return input.target?.value ?? "";
    if ("value" in input) return input.value ?? "";
  }

  return input ?? "";
};



/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */

const VEHSVMast_SetupTab = ({
  form = {},
  isEditing = false,
  isReadOnly = false,
  isLoading = false,
  onChangeForm,
  onBlurPlateNo,
}) => {
  const readOnly =
    isReadOnly ||
    !isEditing;

  const isNewRecord =
    Boolean(form.__isNew);

  const isDisabled =
    readOnly ||
    isLoading;

  const imageInputRef =
    useRef(null);

  const [isCustOpen, setIsCustOpen] =
    useState(false);

  const [isMakeOpen, setIsMakeOpen] =
    useState(false);

  const [isModelOpen, setIsModelOpen] =
    useState(false);

  const [isTypeOpen, setIsTypeOpen] =
    useState(false);

  const [isClassOpen, setIsClassOpen] =
    useState(false);

  /* ─────────────────────────────────────────────────────────────────────────
     REFERENCE OPTIONS
     ───────────────────────────────────────────────────────────────────────── */

  const transmissionOptions =
    useMemo(
      () => [
        {
          value: "AT",
          label: "Automatic",
        },
        {
          value: "MT",
          label: "Manual",
        },
      ],
      []
    );

  /* ─────────────────────────────────────────────────────────────────────────
     VEHICLE IMAGE
     ───────────────────────────────────────────────────────────────────────── */

  const imageSrc =
    form.vehicleImagePreviewUrl ||
    form.vehicleImageUrl ||
    (form.vehicleImageBase64
      ? String(form.vehicleImageBase64).startsWith("data:")
        ? form.vehicleImageBase64
        : `data:image/jpeg;base64,${form.vehicleImageBase64}`
      : "") ||
    genericVehicleImage;

  const handleImage = async (file) => {
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(String(file.type || "").toLowerCase())) {
      await useSwalErrorAlert(
        "Invalid Image",
        "Please select a JPG, JPEG, PNG, or WebP image file."
      );
      return;
    }

    if (file.size >= 10 * 1024 * 1024) {
      await useSwalErrorAlert(
        "Image Too Large",
        "Vehicle image must be less than 10 MB."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = String(reader.result || "");

      onChangeForm?.({
        vehicleImageFile: file,
        vehicleImagePreviewUrl: dataUrl,
        vehicleImageBase64: dataUrl,
        removeVehicleImage: false,
      });
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    onChangeForm?.({
      vehicleImageFile: null,
      vehicleImagePreviewUrl: "",
      vehicleImageUrl: genericVehicleImage,
      vehicleImageBase64: "",
      removeVehicleImage: true,
    });

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
     ───────────────────────────────────────────────────────────────────────── */

  return (
    <>
      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-2
          xl:grid-cols-3
          gap-4
          items-stretch
        "
      >

        {/* ═══════════════════════════════════════════════════════
            1. BASIC INFORMATION
            ═══════════════════════════════════════════════════════ */}

        <Card className="border border-blue-500/30 p-5 rounded-lg h-full">
          <SectionHeader title="BASIC INFORMATION" />

          <div className="space-y-3">

            <FieldRenderer
              label="Plate #"
              required
              type="text"
              value={
                form.plateNo || ""
              }
              onChange={(v) =>
                onChangeForm?.({
                  plateNo:
                    String(
                      getValue(v)
                    ).toUpperCase(),
                })
              }
              onBlur={() =>
                onBlurPlateNo?.(
                  form.plateNo
                )
              }
              readOnly={
                readOnly ||
                !isNewRecord
              }
              disabled={
                isDisabled ||
                !isNewRecord
              }
            />

            <div
              className="
                grid
                grid-cols-[minmax(120px,160px)_minmax(0,1fr)]
                gap-2
              "
            >
              <FieldRenderer
                label="Customer Code"
                required
                type="lookup"
                value={
                  form.custCode || ""
                }
                onChange={(v) => {
                  const value =
                    getValue(v);

                  onChangeForm?.({
                    custCode:
                      value,

                    ...(
                      value
                        ? {}
                        : {
                          custName:
                            "",
                        }
                    ),
                  });
                }}
                onLookup={() =>
                  !isDisabled &&
                  setIsCustOpen(true)
                }
                readOnly={readOnly}
                disabled={isDisabled}
              />

              <FieldRenderer
                type="text"
                value={
                  form.custName || ""
                }
                readOnly
                disabled
              />
            </div>

            <FieldRenderer
              label="Vehicle Make"
              required
              type="lookup"
              value={
                form.vehMake || ""
              }
              onChange={(v) => {
                const value = String(
                  getValue(v) ?? ""
                )
                  .trim()
                  .toUpperCase();

                onChangeForm?.({
                  vehMake: value,
                  vehMakeName:
                    value === form.vehMake
                      ? form.vehMakeName || ""
                      : "",

                  /*
                   * Vehicle Model depends on Make.
                   * Clear it whenever Make changes.
                   */
                  vehModel: "",
                  vehModelName: "",
                });
              }}
              onLookup={() => {
                if (!isDisabled) {
                  setIsMakeOpen(true);
                }
              }}
              readOnly={readOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Vehicle Type"
              type="lookup"
              value={
                form.vehType || ""
              }
              onChange={(v) => {
                const value = String(
                  getValue(v) ?? ""
                )
                  .trim()
                  .toUpperCase();

                onChangeForm?.({
                  vehType: value,
                  vehTypeName:
                    value === form.vehType
                      ? form.vehTypeName || ""
                      : "",
                });
              }}
              onLookup={() => {
                if (!isDisabled) {
                  setIsTypeOpen(true);
                }
              }}
              readOnly={readOnly}
              disabled={isDisabled}
            />

          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════
            2. VEHICLE SPECIFICATION
            ═══════════════════════════════════════════════════════ */}

        <Card className="border border-blue-500/30 p-5 rounded-lg h-full">
          <SectionHeader title="VEHICLE SPECIFICATION" />

          <div className="space-y-3">

            <FieldRenderer
              label="Vehicle Model"
              required
              type="lookup"
              value={
                form.vehModel || ""
              }
              onChange={(v) => {
                const value = String(
                  getValue(v) ?? ""
                )
                  .trim()
                  .toUpperCase();

                onChangeForm?.({
                  vehModel: value,
                  vehModelName:
                    value === form.vehModel
                      ? form.vehModelName || ""
                      : "",
                });
              }}
              onLookup={() => {
                if (
                  !isDisabled &&
                  form.vehMake
                ) {
                  setIsModelOpen(true);
                }
              }}
              readOnly={readOnly}
              disabled={
                isDisabled ||
                !form.vehMake
              }
            />

            <FieldRenderer
              label="Vehicle Class"
              type="lookup"
              value={
                form.vehClass || ""
              }
              onChange={(v) => {
                const value = String(
                  getValue(v) ?? ""
                )
                  .trim()
                  .toUpperCase();

                onChangeForm?.({
                  vehClass: value,
                  vehClassName:
                    value === form.vehClass
                      ? form.vehClassName || ""
                      : "",
                });
              }}
              onLookup={() => {
                if (!isDisabled) {
                  setIsClassOpen(true);
                }
              }}
              readOnly={readOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Year"
              type="text"
              value={
                form.year || ""
              }
              onChange={(v) =>
                onChangeForm?.({
                  year:
                    String(
                      getValue(v)
                    )
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(
                        0,
                        4
                      ),
                })
              }
              readOnly={readOnly}
              disabled={isDisabled}
              maxLength={4}
            />

            <FieldRenderer
              label="Transmission"
              required
              type="select"
              options={
                transmissionOptions
              }
              value={
                form.transmission ||
                ""
              }
              onChange={(v) =>
                onChangeForm?.({
                  transmission:
                    getValue(v),
                })
              }
              readOnly={readOnly}
              disabled={isDisabled}
            />

          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════
            3. VEHICLE IMAGE
            ═══════════════════════════════════════════════════════ */}

        <Card className="border border-blue-500/30 p-5 rounded-lg h-full">
          <SectionHeader
            title="VEHICLE IMAGE"
            icon={
              <FontAwesomeIcon
                icon={faCamera}
              />
            }
          />

          <div className="flex flex-col gap-3 h-full">

            {/* IMAGE PREVIEW */}
            <div
              className="
                min-h-[210px]
                flex-1
                w-full
                overflow-hidden
                rounded-md
                border
                border-slate-200
                bg-slate-50
                flex
                items-center
                justify-center
              "
            >
              <img
                src={imageSrc}
                alt="Vehicle"
                className="block max-h-full max-w-full"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "center",
                }}
                onError={(event) => {
                  if (event.currentTarget.dataset.fallbackApplied === "1") return;
                  event.currentTarget.dataset.fallbackApplied = "1";
                  event.currentTarget.src = genericVehicleImage;
                }}
              />
            </div>

            {/* HIDDEN FILE INPUT */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(event) => {
                const file =
                  event.target
                    .files?.[0];

                handleImage(file);

                /*
                 * Allows same file
                 * to be selected again.
                 */
                event.target.value =
                  "";
              }}
            />

            {/* IMAGE ACTIONS */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  imageInputRef.current
                    ?.click?.()
                }
                disabled={isDisabled}
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-md
                  bg-blue-600
                  px-3
                  py-2
                  text-xs
                  font-medium
                  text-white
                  transition
                  hover:bg-blue-700
                  disabled:opacity-50
                "
              >
                <FontAwesomeIcon
                  icon={faCamera}
                />

                Select Image
              </button>

              <button
                type="button"
                onClick={
                  handleRemoveImage
                }
                disabled={
                  isDisabled ||
                  imageSrc === genericVehicleImage
                }
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-md
                  border
                  border-red-300
                  bg-white
                  px-3
                  py-2
                  text-xs
                  font-medium
                  text-red-600
                  transition
                  hover:bg-red-50
                  disabled:opacity-50
                "
              >
                Remove Image
              </button>
            </div>

            <div
              className="
                text-[10px]
                leading-4
                text-slate-400
              "
            >
              Accepted formats:
              JPG, JPEG and PNG.
            </div>

          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════
            4. VEHICLE IDENTIFICATION
            ═══════════════════════════════════════════════════════ */}

        <Card className="border border-blue-500/30 p-5 rounded-lg h-full">
          <SectionHeader title="VEHICLE IDENTIFICATION" />

          <div className="space-y-3">

            <FieldRenderer
              label="Engine #"
              type="text"
              value={
                form.engineNo || ""
              }
              onChange={(v) =>
                onChangeForm?.({
                  engineNo:
                    getValue(v),
                })
              }
              readOnly={readOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Chassis #"
              type="text"
              value={
                form.chassisNo || ""
              }
              onChange={(v) =>
                onChangeForm?.({
                  chassisNo:
                    getValue(v),
                })
              }
              readOnly={readOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Motor #"
              type="text"
              value={
                form.motorNo || ""
              }
              onChange={(v) =>
                onChangeForm?.({
                  motorNo:
                    getValue(v),
                })
              }
              readOnly={readOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="MVRR #"
              type="text"
              value={
                form.mvrrNo || ""
              }
              onChange={(v) =>
                onChangeForm?.({
                  mvrrNo:
                    getValue(v),
                })
              }
              readOnly={readOnly}
              disabled={isDisabled}
            />

          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════
            5. VEHICLE INSURANCE
            ═══════════════════════════════════════════════════════ */}

        <Card className="border border-blue-500/30 p-5 rounded-lg h-full">
          <SectionHeader title="VEHICLE INSURANCE" />

          <div className="space-y-3">

            <FieldRenderer
              label="Insurance Co."
              type="text"
              value={
                form.insuranceName ||
                ""
              }
              onChange={(v) =>
                onChangeForm?.({
                  insuranceName:
                    getValue(v),
                })
              }
              readOnly={readOnly}
              disabled={isDisabled}
            />

            <FieldRenderer
              label="Policy No."
              type="text"
              value={
                form.policyNo || ""
              }
              onChange={(v) =>
                onChangeForm?.({
                  policyNo:
                    getValue(v),
                })
              }
              readOnly={readOnly}
              disabled={isDisabled}
            />

          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════
      6. REGISTRATION INFORMATION
      ═══════════════════════════════════════════════════════ */}

        <div className="h-full">
          <RegistrationInfo
            layout="minimize"
            disabled
            data={{
              registeredBy:
                form.registeredBy || "",

              registeredDate:
                form.registeredDate || "",

              lastUpdatedBy:
                form.updatedBy ||
                form.lastUpdatedBy ||
                "",

              lastUpdatedDate:
                form.updatedDate ||
                form.lastUpdatedDate ||
                "",
            }}
          />
        </div>


      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VEHICLE MAKE LOOKUP
          ══════════════════════════════════════════════════════════════════════ */}

      <SearchVEMakeRef
        isOpen={isMakeOpen}
        onClose={(selected) => {
          setIsMakeOpen(false);

          if (!selected) {
            return;
          }

          const makeCode = String(
            selected.code ??
            selected.makeCode ??
            selected.make_code ??
            ""
          )
            .trim()
            .toUpperCase();

          const makeName = String(
            selected.description ??
            selected.makeName ??
            selected.make_name ??
            ""
          ).trim();

          onChangeForm?.({
            vehMake: makeCode,
            vehMakeName: makeName,

            /*
             * Selecting/changing Make invalidates
             * the previously selected Model.
             */
            vehModel: "",
            vehModelName: "",
          });
        }}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          VEHICLE TYPE LOOKUP
          ══════════════════════════════════════════════════════════════════════ */}

      <SearchVETypeRef
        isOpen={isTypeOpen}
        onClose={(selected) => {
          setIsTypeOpen(false);

          if (!selected) {
            return;
          }

          const typeCode = String(
            selected.code ??
            selected.typeCode ??
            selected.type_code ??
            ""
          )
            .trim()
            .toUpperCase();

          const typeName = String(
            selected.description ??
            selected.typeName ??
            selected.type_name ??
            ""
          ).trim();

          onChangeForm?.({
            vehType: typeCode,
            vehTypeName: typeName,
          });
        }}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          VEHICLE MODEL LOOKUP
          ══════════════════════════════════════════════════════════════════════ */}

      <SearchVEModelRef
        isOpen={isModelOpen}
        makeCode={form.vehMake || ""}
        onClose={(selected) => {
          setIsModelOpen(false);

          if (!selected) {
            return;
          }

          const modelCode = String(
            selected.code ??
            selected.modelCode ??
            selected.model_code ??
            ""
          )
            .trim()
            .toUpperCase();

          const modelName = String(
            selected.description ??
            selected.modelName ??
            selected.model_name ??
            ""
          ).trim();

          onChangeForm?.({
            vehModel: modelCode,
            vehModelName: modelName,
          });
        }}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          VEHICLE CLASS LOOKUP
          ══════════════════════════════════════════════════════════════════════ */}

      <SearchVEClassRef
        isOpen={isClassOpen}
        onClose={(selected) => {
          setIsClassOpen(false);

          if (!selected) {
            return;
          }

          const classCode = String(
            selected.code ??
            selected.classCode ??
            selected.class_code ??
            selected.vehClass ??
            selected.VEH_CLASS ??
            ""
          )
            .trim()
            .toUpperCase();

          const className = String(
            selected.description ??
            selected.className ??
            selected.class_name ??
            selected.vehClassName ??
            selected.VEH_CLASS_NAME ??
            ""
          ).trim();

          onChangeForm?.({
            vehClass: classCode,
            vehClassName: className,
          });
        }}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          CUSTOMER LOOKUP
          ══════════════════════════════════════════════════════════════════════ */}

      <SearchCustMast
        isOpen={isCustOpen}
        customParam="ActiveAll"
        onClose={(selected) => {
          setIsCustOpen(false);

          if (!selected) {
            return;
          }

          const row =
            Array.isArray(
              selected?.records
            )
              ? selected.records[0]
              : selected?.records ||
              selected;

          if (!row) {
            return;
          }

          onChangeForm?.({
            custCode:
              row.custCode ??
              row.cust_code ??
              row.CUST_CODE ??
              row.code ??
              "",

            custName:
              row.custName ??
              row.cust_name ??
              row.CUST_NAME ??
              row.description ??
              "",
          });
        }}
      />
    </>
  );
};

export default VEHSVMast_SetupTab;