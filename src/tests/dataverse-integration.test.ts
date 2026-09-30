import { afterAll, describe, expect, test } from 'bun:test';

/**
 * Live Dataverse integration tests.
 *
 * This suite is opt-in because it connects to a real environment and temporarily
 * creates an Application row. Configure these environment variables:
 *
 * DATAVERSE_TEST_URL=https://your-org.crm.dynamics.com
 * DATAVERSE_TEST_TOKEN=<OAuth access token for that organization>
 * DATAVERSE_INTEGRATION_TESTS=true
 *
 * Run from apps/provisioning-hub with:
 * `bun test src/tests/dataverse-integration.test.ts --timeout 60000`
 *
 * The created row is always deleted in afterAll, including when an assertion
 * fails after creation.
 */

const dataverseUrl = process.env.DATAVERSE_TEST_URL?.replace(/\/$/, '');
const accessToken = process.env.DATAVERSE_TEST_TOKEN;
const integrationTestsEnabled = process.env.DATAVERSE_INTEGRATION_TESTS === 'true';
const describeDataverse = integrationTestsEnabled ? describe : describe.skip;

/** Every Dataverse entity set configured in power.config.json. */
const entitySets = [
  'cr048_workflowstageoptions',
  'cr048_securityconfigurations',
  'cr048_activityrecords',
  'cr048_requeststageconfigurations',
  'cr048_notificationrecords',
  'cr048_guidelinks',
  'cr048_emailtemplates',
  'dat_accesscontrolenvironmentassignments',
  'dat_accesscontrolroleassignments',
  'dat_requesteduserstageprogresses',
  'dat_requestusers',
  'dat_requestuserroles',
  'cr048_application1s',
  'cr048_accesscontrolentries',
  'cr048_accessroles',
  'cr048_environments',
  'cr048_requestedusers',
  'cr048_provisioningrequests',
] as const;

/** Logical table names paired with primary key columns for metadata/schema checks. */
const tableContracts = [
  ['cr048_workflowstageoption', 'cr048_workflowstageoptionid'],
  ['cr048_securityconfiguration', 'cr048_securityconfigurationid'],
  ['cr048_activityrecord', 'cr048_activityrecordid'],
  ['cr048_requeststageconfiguration', 'cr048_requeststageconfigurationid'],
  ['cr048_notificationrecord', 'cr048_notificationrecordid'],
  ['cr048_guidelink', 'cr048_guidelinkid'],
  ['cr048_emailtemplate', 'cr048_emailtemplateid'],
  ['dat_accesscontrolenvironmentassignment', 'dat_accesscontrolenvironmentassignmentid'],
  ['dat_accesscontrolroleassignment', 'dat_accesscontrolroleassignmentid'],
  ['dat_requesteduserstageprogress', 'dat_requesteduserstageprogressid'],
  ['dat_requestuser', 'dat_requestuserid'],
  ['dat_requestuserrole', 'dat_requestuserroleid'],
  ['cr048_application1', 'cr048_application1id'],
  ['cr048_accesscontrolentry', 'cr048_accesscontrolentryid'],
  ['cr048_accessrole', 'cr048_accessroleid'],
  ['cr048_environment', 'cr048_environmentid'],
  ['cr048_requesteduser', 'cr048_requesteduserid'],
  ['cr048_provisioningrequest', 'cr048_provisioningrequestid'],
] as const;

/** Current option-set values and relationship columns relied on by the application. */
const optionSetContracts = [
  ['cr048_notificationrecord', 'cr048_status', ['Sent', 'Failed', 'Queued', 'Sending']],
  ['cr048_securityconfiguration', 'cr048_architecture', ['Direct Role', 'Team Based', 'Combined']],
] as const;

const lookupContracts = [
  ['cr048_securityconfiguration', 'dat_application', 'cr048_application1'],
] as const;

let createdApplicationId: string | undefined;

/** Builds a Dataverse Web API URL while keeping the environment configurable. */
function apiUrl(path: string): string {
  if (!dataverseUrl) {
    throw new Error('DATAVERSE_TEST_URL is required when integration tests are enabled.');
  }

  return `${dataverseUrl}/api/data/v9.2/${path}`;
}

/** Sends an authenticated request and returns the raw response for assertion. */
async function dataverseRequest(path: string, init?: RequestInit): Promise<Response> {
  if (!accessToken) {
    throw new Error('DATAVERSE_TEST_TOKEN is required when integration tests are enabled.');
  }

  return fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      ...init?.headers,
    },
  });
}

/** Returns a GUID that is valid but extremely unlikely to identify a real record. */
function missingRecordId(): string {
  return crypto.randomUUID();
}

/** Produces a useful failure message containing Dataverse response details. */
async function expectSuccess(response: Response, action: string): Promise<void> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${action} failed (${response.status}): ${body}`);
  }
}

/** Extracts the GUID returned in Dataverse's OData-EntityId response header. */
function getCreatedRecordId(response: Response): string {
  const entityId = response.headers.get('OData-EntityId');
  const match = entityId?.match(/\(([0-9a-f-]{36})\)$/i);

  if (!match?.[1]) {
    throw new Error('Dataverse did not return an OData-EntityId for the created record.');
  }

  return match[1];
}

describeDataverse('Dataverse integration', () => {
  afterAll(async () => {
    // Cleanup is idempotent so a partially completed CRUD test does not leave test data behind.
    if (!createdApplicationId) return;

    const response = await dataverseRequest(`cr048_application1s(${createdApplicationId})`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 404) {
      await expectSuccess(response, 'Application cleanup');
    }

    createdApplicationId = undefined;
  });

  test('can read every configured Dataverse table', async () => {
    // A one-row query verifies authentication, table access, and configured entity-set names.
    for (const entitySet of entitySets) {
      const response = await dataverseRequest(`${entitySet}?$top=1`);
      await expectSuccess(response, `Read ${entitySet}`);
      const payload = (await response.json()) as { value?: unknown[] };
      expect(Array.isArray(payload.value)).toBe(true);
    }
  }, 60_000);

  test('creates, reads, updates, and deletes an Application record', async () => {
    const uniqueName = `Integration Test ${crypto.randomUUID()}`;
    const updatedName = `${uniqueName} Updated`;

    const createResponse = await dataverseRequest('cr048_application1s', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        cr048_applicationname: uniqueName,
        cr048_activestate: true,
        cr048_description: 'Temporary automated integration test record.',
      }),
    });
    await expectSuccess(createResponse, 'Create Application');
    createdApplicationId = getCreatedRecordId(createResponse);
    const createdRepresentation = (await createResponse.json()) as {
      cr048_application1id?: string;
    };
    expect(createdRepresentation.cr048_application1id).toBe(createdApplicationId);

    const readResponse = await dataverseRequest(
      `cr048_application1s(${createdApplicationId})?$select=cr048_applicationname,cr048_activestate`,
    );
    await expectSuccess(readResponse, 'Read Application');
    const created = (await readResponse.json()) as {
      cr048_applicationname?: string;
      cr048_activestate?: boolean;
    };
    expect(created.cr048_applicationname).toBe(uniqueName);
    expect(created.cr048_activestate).toBe(true);

    const updateResponse = await dataverseRequest(`cr048_application1s(${createdApplicationId})`, {
      method: 'PATCH',
      headers: {
        'If-Match': '*',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        cr048_applicationname: updatedName,
        cr048_activestate: false,
      }),
    });
    await expectSuccess(updateResponse, 'Update Application');
    const updatedRepresentation = (await updateResponse.json()) as {
      cr048_applicationname?: string;
      cr048_activestate?: boolean;
    };
    expect(updatedRepresentation.cr048_applicationname).toBe(updatedName);
    expect(updatedRepresentation.cr048_activestate).toBe(false);

    const verifyResponse = await dataverseRequest(
      `cr048_application1s(${createdApplicationId})?$select=cr048_applicationname,cr048_activestate`,
    );
    await expectSuccess(verifyResponse, 'Verify updated Application');
    const updated = (await verifyResponse.json()) as {
      cr048_applicationname?: string;
      cr048_activestate?: boolean;
    };
    expect(updated.cr048_applicationname).toBe(updatedName);
    expect(updated.cr048_activestate).toBe(false);

    const deletedApplicationId = createdApplicationId;
    const deleteResponse = await dataverseRequest(`cr048_application1s(${deletedApplicationId})`, {
      method: 'DELETE',
    });
    await expectSuccess(deleteResponse, 'Delete Application');
    createdApplicationId = undefined;

    const deletedResponse = await dataverseRequest(
      `cr048_application1s(${deletedApplicationId})?$select=cr048_application1id`,
    );
    expect(deletedResponse.status).toBe(404);
  }, 60_000);

  test('exposes the expected primary key contract for every configured table', async () => {
    // Metadata checks catch renamed tables or primary keys before CRUD flows fail at runtime.
    for (const [logicalName, primaryIdAttribute] of tableContracts) {
      const response = await dataverseRequest(
        `EntityDefinitions(LogicalName='${logicalName}')?$select=LogicalName,PrimaryIdAttribute`,
      );
      await expectSuccess(response, `Read metadata for ${logicalName}`);
      const metadata = (await response.json()) as {
        LogicalName?: string;
        PrimaryIdAttribute?: string;
      };
      expect(metadata.LogicalName).toBe(logicalName);
      expect(metadata.PrimaryIdAttribute).toBe(primaryIdAttribute);
    }
  }, 60_000);

  test('supports filtered, ordered, and projected collection queries', async () => {
    const response = await dataverseRequest(
      'cr048_application1s?$select=cr048_application1id,cr048_applicationname&$filter=cr048_activestate eq true&$orderby=cr048_applicationname asc&$top=5',
    );
    await expectSuccess(response, 'Query active Applications');
    const payload = (await response.json()) as {
      value?: Array<{ cr048_application1id?: string; cr048_applicationname?: string }>;
    };
    expect(Array.isArray(payload.value)).toBe(true);
    expect((payload.value?.length ?? 0) <= 5).toBe(true);
    for (const application of payload.value ?? []) {
      expect(typeof application.cr048_application1id).toBe('string');
      expect(typeof application.cr048_applicationname).toBe('string');
    }
  }, 60_000);

  test('supports the ordered Activity query used by the Activity page', async () => {
    const response = await dataverseRequest(
      'cr048_activityrecords?$select=cr048_activityrecordid,cr048_activityrecordname,cr048_actiontype,cr048_actorname,cr048_actoremail,cr048_description,cr048_timestamp&$orderby=cr048_timestamp desc&$top=50',
    );
    await expectSuccess(response, 'Query Activity records');
    const payload = (await response.json()) as {
      value?: Array<{ cr048_activityrecordid?: string; cr048_timestamp?: string }>;
    };
    expect(Array.isArray(payload.value)).toBe(true);
    expect((payload.value?.length ?? 0) <= 50).toBe(true);
    for (const activity of payload.value ?? []) {
      expect(typeof activity.cr048_activityrecordid).toBe('string');
      expect(typeof activity.cr048_timestamp).toBe('string');
    }
  }, 60_000);

  test('exposes current notification and security option-set values', async () => {
    for (const [entityLogicalName, attributeLogicalName, expectedLabels] of optionSetContracts) {
      const response = await dataverseRequest(
        `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)`,
      );
      await expectSuccess(response, `Read option set ${entityLogicalName}.${attributeLogicalName}`);
      const metadata = (await response.json()) as {
        LogicalName?: string;
        OptionSet?: { Options?: Array<{ Label?: { UserLocalizedLabel?: { Label?: string } } }> };
      };
      expect(metadata.LogicalName).toBe(attributeLogicalName);
      const labels = metadata.OptionSet?.Options?.map((option: { Label?: { UserLocalizedLabel?: { Label?: string } } }) => option.Label?.UserLocalizedLabel?.Label).filter((label: string | undefined): label is string => Boolean(label)) ?? [];
      for (const expectedLabel of expectedLabels) expect(labels.includes(expectedLabel)).toBe(true);
    }
  }, 60_000);

  test('exposes the direct Application lookup on Security Configuration', async () => {
    for (const [entityLogicalName, attributeLogicalName, targetLogicalName] of lookupContracts) {
      const response = await dataverseRequest(
        `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets`,
      );
      await expectSuccess(response, `Read lookup ${entityLogicalName}.${attributeLogicalName}`);
      const metadata = (await response.json()) as { LogicalName?: string; Targets?: string[] };
      expect(metadata.LogicalName).toBe(attributeLogicalName);
      expect(metadata.Targets?.includes(targetLogicalName)).toBe(true);
    }
  }, 60_000);

  test('returns not found for a missing record without changing data', async () => {
    const response = await dataverseRequest(
      `cr048_application1s(${missingRecordId()})?$select=cr048_application1id`,
    );
    expect(response.status).toBe(404);
  }, 60_000);
});
