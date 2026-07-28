import { DeathCertificate } from '../types';

export class FhirInteroperability {
  /**
   * Transforms a DeathCertificate into a HL7 FHIR R4 Composition & Patient Bundle JSON
   */
  public static exportToFhirR4Bundle(cert: DeathCertificate): object {
    return {
      resourceType: "Bundle",
      id: cert.fhirBundleId || `fhir-bundle-${cert.id}`,
      type: "document",
      timestamp: new Date(cert.timestamp).toISOString(),
      entry: [
        {
          fullUrl: `urn:uuid:patient-${cert.id}`,
          resource: {
            resourceType: "Patient",
            id: `patient-${cert.id}`,
            identifier: [
              {
                system: "http://hospital.gov/national-id",
                value: cert.nationalId
              }
            ],
            name: [
              {
                use: "official",
                text: cert.deceasedName
              }
            ],
            gender: cert.gender.toLowerCase(),
            birthDate: cert.dateOfBirth,
            deceasedDateTime: `${cert.dateOfDeath}T${cert.timeOfDeath || '00:00'}:00Z`
          }
        },
        {
          fullUrl: `urn:uuid:observation-cause-of-death-${cert.id}`,
          resource: {
            resourceType: "Observation",
            id: `observation-cause-${cert.id}`,
            status: "final",
            code: {
              coding: [
                {
                  system: "http://hl7.org/fhir/sid/icd-10",
                  code: cert.causeOfDeathICD10.split(' - ')[0] || cert.causeOfDeathICD10,
                  display: cert.causeOfDeathICD10
                }
              ]
            },
            subject: {
              reference: `urn:uuid:patient-${cert.id}`
            },
            valueString: cert.causeOfDeathICD10,
            note: cert.secondaryCauses ? [{ text: `Secondary: ${cert.secondaryCauses}` }] : []
          }
        },
        {
          fullUrl: `urn:uuid:practitioner-${cert.id}`,
          resource: {
            resourceType: "Practitioner",
            id: `practitioner-${cert.id}`,
            identifier: [
              {
                system: "http://hl7.org/fhir/sid/us-npi",
                value: cert.attendingPhysicianLicense
              }
            ],
            name: [
              {
                text: cert.attendingPhysicianName
              }
            ]
          }
        },
        {
          fullUrl: `urn:uuid:blockchain-proof-${cert.id}`,
          resource: {
            resourceType: "Provenance",
            id: `blockchain-provenance-${cert.id}`,
            target: [{ reference: `urn:uuid:patient-${cert.id}` }],
            recorded: new Date(cert.timestamp).toISOString(),
            signature: [
              {
                type: [
                  {
                    system: "urn:iso-astm:E1762-95:2013",
                    code: "1.2.840.10065.1.12.1.1"
                  }
                ],
                when: new Date(cert.timestamp).toISOString(),
                who: { display: cert.attendingPhysicianName },
                data: cert.physicianSignatureHash || "0xsig_verified"
              }
            ],
            entity: [
              {
                role: "source",
                what: {
                  identifier: {
                    system: "urn:blockchain:hash",
                    value: cert.blockchainTxHash || "0xpending_tx"
                  },
                  display: `Block #${cert.blockNumber || 0} - IPFS CID: ${cert.ipfsCid}`
                }
              }
            ]
          }
        }
      ]
    };
  }

  /**
   * Parses an incoming FHIR bundle and imports it as a DeathCertificate draft
   */
  public static parseFhirBundle(fhirJson: any): Partial<DeathCertificate> {
    try {
      const entries = fhirJson.entry || [];
      const patientEntry = entries.find((e: any) => e.resource?.resourceType === 'Patient')?.resource;
      const observationEntry = entries.find((e: any) => e.resource?.resourceType === 'Observation')?.resource;
      const practitionerEntry = entries.find((e: any) => e.resource?.resourceType === 'Practitioner')?.resource;

      const fullName = patientEntry?.name?.[0]?.text || "Unknown Patient";
      const givenNames = patientEntry?.name?.[0]?.given || [];
      const familyName = patientEntry?.name?.[0]?.family || "";

      let firstName = givenNames[0] || "";
      let secondName = givenNames.slice(1).join(" ") || "";
      let lastName = familyName || "";

      if (!firstName && fullName) {
        const parts = fullName.split(' ');
        firstName = parts[0] || "";
        if (parts.length === 2) {
          lastName = parts[1];
        } else if (parts.length >= 3) {
          secondName = parts.slice(1, parts.length - 1).join(" ");
          lastName = parts[parts.length - 1];
        }
      }

      return {
        firstName,
        secondName,
        lastName,
        deceasedName: fullName || `${firstName} ${secondName ? secondName + ' ' : ''}${lastName}`.trim(),
        nationalId: patientEntry?.identifier?.[0]?.value || "NATIONAL-ID-IMPORT",
        gender: (patientEntry?.gender?.toUpperCase() as any) || "OTHER",
        dateOfBirth: patientEntry?.birthDate || "1980-01-01",
        dateOfDeath: patientEntry?.deceasedDateTime?.split('T')[0] || new Date().toISOString().split('T')[0],
        timeOfDeath: patientEntry?.deceasedDateTime?.split('T')[1]?.substring(0, 5) || "12:00",
        causeOfDeathICD10: observationEntry?.code?.coding?.[0]?.display || observationEntry?.valueString || "R99 - Other ill-defined and unspecified causes of mortality",
        attendingPhysicianName: practitionerEntry?.name?.[0]?.text || "Dr. Imported Medical Officer",
        attendingPhysicianLicense: practitionerEntry?.identifier?.[0]?.value || "LIC-IMPORT-9901",
        placeOfDeath: "Hospital Ward 4 (EHR Import)",
        placeType: "HOSPITAL",
        causeCategory: "NATURAL"
      };
    } catch (e) {
      console.error("Failed to parse FHIR bundle:", e);
      throw new Error("Invalid FHIR R4 JSON file structure.");
    }
  }
}
