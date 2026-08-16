import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TerraformConfiguration from './TerraformConfiguration';

describe('TerraformConfiguration VM flow', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a VM deployment and shows a success message after generating VM files', async () => {
    const fetchMock = jest.fn((url, options = {}) => {
      if (url.includes('/terraform/state/123')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            terraformState: {
              serviceId: '123',
              awsCredentialId: 'cred-1',
              s3Bucket: 's3://terraform-state',
              useEcr: false,
              deploymentType: 'vm',
              generated: false,
            },
          }),
        });
      }

      if (url.includes('/infra/vm/123/vms') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { id: 'vm-1' } }),
        });
      }

      if (url.includes('/terraform/generate') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Terraform files generated.',
            outputDir: '/tmp/generated',
            modules: { network: true, vm: true },
          }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    global.fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={['/services/123/terraform-configuration']}>
        <Routes>
          <Route path='/services/:serviceId/terraform-configuration' element={<TerraformConfiguration />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/vm name/i), 'test-vm');
    await userEvent.type(screen.getByLabelText(/region/i), 'us-east-1');
    await userEvent.type(screen.getByLabelText(/instance type/i), 't3.micro');
    await userEvent.type(screen.getByLabelText(/kind cluster name/i), 'kind');
    await userEvent.type(screen.getByLabelText(/container port/i), '3000');
    await userEvent.type(screen.getByLabelText(/host port/i), '80');

    await userEvent.click(screen.getByRole('button', { name: /generate vm/i }));

    await waitFor(() => {
      expect(screen.getByText(/vm generated successfully/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/infra/vm/123/vms'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/terraform/generate'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('creates a VM deployment before generating Terraform files for a VM deployment', async () => {
    const fetchMock = jest.fn((url, options = {}) => {
      if (url.includes('/terraform/state/123')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            terraformState: {
              serviceId: '123',
              awsCredentialId: 'cred-1',
              s3Bucket: 's3://terraform-state',
              useEcr: false,
              deploymentType: 'vm',
              generated: false,
            },
          }),
        });
      }

      if (url.includes('/infra/vm/123/vms') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { id: 'vm-1' } }),
        });
      }

      if (url.includes('/infra/terraform/services/123/generate') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Terraform files generated.',
            outputDir: '/tmp/generated',
            modules: { network: true, vm: true },
          }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    global.fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={['/services/123/terraform-configuration']}>
        <Routes>
          <Route path='/services/:serviceId/terraform-configuration' element={<TerraformConfiguration />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: /generate terraform files/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/infra/vm/123/vms'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/infra/terraform/services/123/generate'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('uses the EKS form values when generating Terraform files', async () => {
    const fetchMock = jest.fn((url, options = {}) => {
      if (url.includes('/terraform/state/123')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            terraformState: {
              serviceId: '123',
              awsCredentialId: 'cred-1',
              s3Bucket: 's3://terraform-state',
              useEcr: false,
              deploymentType: 'eks',
              generated: false,
            },
          }),
        });
      }

      if (url.includes('/infra/eks/123/clusters') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ success: true, data: { id: 'eks-1' } }),
        });
      }

      if (url.includes('/terraform/generate') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Terraform files generated.',
            outputDir: '/tmp/generated',
            modules: { network: true, eks: true },
          }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    global.fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={['/services/123/terraform-configuration']}>
        <Routes>
          <Route path='/services/:serviceId/terraform-configuration' element={<TerraformConfiguration />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByLabelText(/amazon eks/i));
    await userEvent.clear(screen.getByLabelText(/cluster name/i));
    await userEvent.type(screen.getByLabelText(/cluster name/i), 'demo-cluster');
    await userEvent.clear(screen.getByLabelText(/cluster version/i));
    await userEvent.type(screen.getByLabelText(/cluster version/i), '1.35');
    await userEvent.clear(screen.getByLabelText(/region/i));
    await userEvent.type(screen.getByLabelText(/region/i), 'eu-north-1');

    await userEvent.click(screen.getByRole('button', { name: /generate terraform files/i }));

    await waitFor(() => {
      expect(screen.getByText(/eks cluster and terraform files generated successfully/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/infra/eks/123/clusters'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/terraform/generate'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
